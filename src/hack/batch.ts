/*!
 * LJ's Bitburner Scripts
 * Copyright (C) 2023 ElJay#7711
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import {NS} from "@ns";
import Prepare from "./prepare";
import {
  Job, Jobs, Color, Port,
  OP, Stage, HACK_LEVEL_RANGE, PRINT_SPACER,
  SAFE_THRESHOLD, JOB_ORDER
} from "../util/const";
import {
  GetID, GetPercent, Impossible, JobRecord
} from "../util/misc";
import RAM from "../util/ram";
import {GetJobDelays} from "../util/stalefish";
import {GetThreads, GetProfitServers, Metrics} from "../util/stat";

interface ScheduleInfo {
  job: Job;
  createdAt: number;
  run: (lateBy: number) => Promise<void>;
}

class Scheduler {
  #delays = JobRecord(0);
  #tasks = new Map<string, ScheduleInfo>();

  Add(job: Job, createdAt: number, run: (lateBy: number) => Promise<void>) {
    const id = GetID(i => this.#tasks.has(i));

    this.#tasks.set(id, {job, createdAt, run});

    return id;
  }

  Has(id: string) {
    return this.#tasks.has(id);
  }

  Cancel(id: string) {
    return this.#tasks.delete(id);
  }

  Adjust(delays: Record<Job, number>) {
    for(const job of Jobs)
      this.#delays[job] = delays[job];
  }

  async Run(now: number) {
    for(const [id, task] of this.#tasks) {
      const delay = this.#delays[task.job];

      if(task.createdAt + delay <= now) {
        this.#tasks.delete(id);
        await task.run(now - task.createdAt - delay);
      }
    }
  }
}

class Batch {
  partial = 0;
  scheduled = new Map<Job, string>();
  workers = new Map<Job, number>();
  finished: Job[] = [];

  constructor(scheduled: Record<Job, string>) {
    for(const job of Jobs)
      this.scheduled.set(job, scheduled[job]);
  }
}

class Batcher {
  #ns;
  #hostname;
  #duration;
  #depth;
  #leech;
  #level;
  #maxLevel;

  #started = 0;
  #late = 0;
  #desynced = 0;
  #cancelled = 0;
  #partial = 0;
  #finished = 0;

  #stage = Stage.Stopped;
  #createdAt = 0;
  #lastPrint = 0;
  #threads = JobRecord(0);
  #scheduler = new Scheduler();
  #batches = new Map<string, Batch>();
  #workers: Record<Job, number[]> = {
    [Job.Hack]: [],
    [Job.Weak1]: [],
    [Job.Grow]: [],
    [Job.Weak2]: []
  };

  constructor(ns: NS, metrics: Metrics) {
    this.#ns = ns;
    this.#hostname = metrics.hostname;
    this.#duration = metrics.duration;
    this.#depth = metrics.depth;
    this.#leech = metrics.leech;
    this.#level = this.#ns.getPlayer().skills.hacking;
    this.#maxLevel = this.#level + HACK_LEVEL_RANGE - 1;
    this.#Adjust();
  }

  #Adjust() {
    this.#threads = GetThreads(this.#ns, this.#hostname, this.#leech);
    this.#scheduler.Adjust(GetJobDelays(this.#ns, this.#hostname, {duration: this.#duration, depth: this.#depth}));
  }

  #Online(on: boolean) {
    if(on) {
      this.#stage = Stage.Running;
      this.#ns.writePort(Port.Online, OP.Online);
    }else{
      this.#stage = Stage.Stopped;
      this.#ns.clearPort(Port.Online);
    }
  }

  async #Process(now: number) {
    for(const [id, batch] of this.#batches) {
      for(const [job, pid] of batch.workers) {
        if(this.#ns.readPort(pid) === OP.Finished) {
          batch.workers.delete(job);
          batch.finished.push(job);
          this.#workers[job].push(pid);

          if(batch.finished.length === 4 - batch.partial) {
            ++this.#finished;

            if(JOB_ORDER[batch.partial].some((j, i) => batch.finished[i] !== j))
              ++this.#desynced;

            this.#batches.delete(id);
          }
        }
      }
    }

    await this.#scheduler.Run(now);
  }

  async #Replace(job: Job, pid: number) {
    const ram = new RAM(this.#ns);

    this.#ns.kill(pid);

    const replacement = ram.Spawn(this.#ns, this.#hostname, job, this.#threads[job]);

    if(replacement.length === 0)
      throw Impossible();

    [pid] = replacement;
    await Promise.race([this.#ns.getPortHandle(pid).nextWrite(), this.#ns.asleep(3e4)]);

    if(this.#ns.readPort(pid) !== OP.Online)
      throw Error("A replacement worker failed to respond as online.");

    return pid;
  }

  async #Partial(batch: Batch, grow = false) {
    if(batch.partial !== 0)
      return;

    for(const [job, sid] of batch.scheduled) {
      if(job === Job.Hack || (grow && job === Job.Grow)) {
        this.#scheduler.Cancel(sid);
        batch.scheduled.delete(job);
      }
    }

    const pending = [];

    for(const [job, pid] of batch.workers) {
      if(job === Job.Hack || (grow && job === Job.Grow)) {
        pending.push(this.#Replace(job, pid).then(next => this.#workers[job].push(next)));
        batch.workers.delete(job);
      }
    }

    await Promise.all(pending);
    ++this.#partial;
    batch.partial = 1 + Number(grow);
  }

  async #Cancel(id: string) {
    const batch = this.#batches.get(id);

    if(batch == null)
      throw Impossible();

    for(const sid of batch.scheduled.values())
      this.#scheduler.Cancel(sid);

    const pending = [];

    for(const [job, pid] of batch.workers)
      pending.push(this.#Replace(job, pid).then(next => this.#workers[job].push(next)));

    await Promise.all(pending);
    this.#batches.delete(id);
  }

  #Oldest() {
    for(const batch of this.#batches.values()) {
      if(batch.finished.length === 0)
        return batch;
    }

    return null;
  }

  async #Execute(id: string, job: Job, lateBy: number) {
    const server = this.#ns.getServer(this.#hostname);
    const batch = this.#batches.get(id);

    if(batch == null)
      throw Impossible();

    batch.scheduled.delete(job);

    if(server.hackDifficulty !== server.minDifficulty) {
      const oldest = this.#Oldest();

      if(oldest != null)
        await this.#Partial(oldest, true);

      ++this.#cancelled;

      return this.#Cancel(id);
    }else if(server.moneyAvailable !== server.moneyMax) {
      const oldest = this.#Oldest();

      if(oldest != null)
        await this.#Partial(oldest);
    }else if(lateBy >= SAFE_THRESHOLD) {
      ++this.#late;

      return this.#Cancel(id);
    }

    const pid = this.#workers[job].pop();

    if(pid == null)
      throw Impossible();

    batch.workers.set(job, pid);
    this.#ns.writePort(pid, this.#threads[job]);
  }

  async #Stop() {
    const pending = [];

    this.#stage = Stage.Stopping;

    for(const [id, batch] of this.#batches) {
      if(!batch.workers.has(Job.Hack)) {
        pending.push(this.#Cancel(id));
        this.#batches.delete(id);
      }
    }

    await Promise.all(pending);
  }

  #Start(at: number) {
    const id = GetID(i => this.#batches.has(i));
    const scheduled = JobRecord("");

    for(const job of Jobs)
      scheduled[job] = this.#scheduler.Add(job, at, lateBy => this.#Execute(id, job, lateBy));

    this.#batches.set(id, new Batch(scheduled));
    ++this.#started;
  }

  #Print(now: number) {
    this.#lastPrint = now;

    if(this.#started === 0)
      return;

    this.#ns.clearLog();
    this.#ns.print(`.* Every ${this.#ns.tFormat(this.#duration)} *.`);
    this.#ns.print(`${this.#started} started`);
    this.#ns.print(`- ${this.#late} late (${GetPercent(this.#late / this.#started)})`);
    this.#ns.print(`- ${this.#cancelled} cancelled (${GetPercent(this.#cancelled / this.#started)})`);
    this.#ns.print(`- ${this.#partial} partial (${GetPercent(this.#partial / this.#started)})`);

    if(this.#finished === 0)
      return;

    this.#ns.print(`${this.#finished} finished`);
    this.#ns.print(`- ${this.#desynced} desynced (${GetPercent(this.#desynced / this.#finished)})`);
  }

  async Run() {
    const ram = new RAM(this.#ns);

    this.#Online(true);

    for(let i = 0; i < this.#depth; i++) {
      const pids = ram.Batch(this.#ns, this.#hostname, this.#threads);

      if(pids == null)
        throw Error(`Unable to spawn workers for batch #${i + 1}.`);

      for(const job of Jobs)
        this.#workers[job].push(pids[job]);
    }

    let pids = Object.values(this.#workers).flat();

    await Promise.race([Promise.all(pids.map(pid => this.#ns.getPortHandle(pid).nextWrite())), this.#ns.asleep(3e4)]);

    if((pids = pids.filter(pid => this.#ns.readPort(pid) !== OP.Online)).length !== 0)
      throw Error(`${Color.Fail}${pids.length}/${this.#depth * 4} workers failed to respond as online.`);

    this.#createdAt = performance.now();

    while(true) {
      const now = performance.now();

      if(this.#stage === Stage.Stopping) {
        await this.#Process(now);

        if(this.#batches.size === 0) {
          this.Exit();

          break;
        }

        continue;
      }

      const level = this.#ns.getPlayer().skills.hacking;

      if(level > this.#maxLevel) {
        await this.#Stop();

        continue;
      }else if(this.#level !== level) {
        this.#level = level;
        this.#Adjust();
      }

      const nextAt = this.#createdAt + (this.#duration * this.#started);

      if(nextAt <= now)
        this.#Start(nextAt);

      await this.#Process(now);

      if(now - this.#lastPrint >= PRINT_SPACER)
        this.#Print(now);

      await this.#ns.sleep(0);
    }
  }

  Exit() {
    if(this.#stage === Stage.Stopped)
      return;

    for(const job of Jobs)
      this.#workers[job].forEach(pid => this.#ns.kill(pid));

    for(const batch of this.#batches.values())
      batch.workers.forEach(pid => this.#ns.kill(pid));

    this.#Online(false);
  }
}

export async function main(ns: NS) {
  ns.disableLog("ALL");
  ns.clearLog();
  ns.tail();

  let batcher: Batcher | undefined;

  ns.atExit(() => batcher?.Exit());

  while(true) {
    const metrics = GetProfitServers(ns, 1);

    if(metrics.length === 0) {
      ns.print(`${Color.Fail}No valid hacking targets.`);

      break;
    }

    // TODO: Add fancy logging.
    ns.print("Preparing...");
    await Prepare(ns, metrics[0].hostname);
    batcher = new Batcher(ns, metrics[0]);

    try {
      await batcher.Run();
    }catch(err) {
      ns.print(err);

      break;
    }
  }
}
