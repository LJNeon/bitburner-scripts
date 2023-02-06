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
import {
  Job, Jobs, PermScript, OnceScript,
  ShareScript, ThreadRam, MIN_HOME_RAM, SHARE_PERCENT
} from "./const";
import {
  ScanAll, Impossible, GetID, JobRecord
} from "./misc";

interface Chunk {
  hostname: string;
  threads: number;
}

export default class RAM {
  #ns;
  #simulate;
  #servers = new Map<string, number>();

  constructor(ns: NS, simulate = false) {
    this.#ns = ns;
    this.#simulate = simulate;

    const servers = ScanAll(ns)
      .map(hostname => ns.getServer(hostname))
      .filter(server => server.hasAdminRights && server.maxRam > 0 && !server.hostname.startsWith("hacknet"));

    for(const server of servers) {
      let size = server.maxRam - (this.#simulate ? 0 : server.ramUsed);

      if(server.hostname === "home")
        size -= MIN_HOME_RAM;
      else if(server.purchasedByPlayer
          && (this.#simulate || ns.getRunningScript(ShareScript, server.hostname) == null))
        size -= server.maxRam * SHARE_PERCENT;

      if(size < ThreadRam.Hack)
        continue;

      this.#servers.set(server.hostname, size);
    }
  }

  #Per(job: Job) {
    return job === Job.Hack ? ThreadRam.Hack : ThreadRam.WeakOrGrow;
  }

  #Cores(hostname: string, threads: number) {
    const {cpuCores} = this.#ns.getServer(hostname);

    if(cpuCores === 1)
      return threads;

    return Math.ceil(threads / (1 + ((cpuCores - 1) / 16)));
  }

  #Largest(job: Job, min = 1) {
    const per = job === Job.Hack ? ThreadRam.Hack : ThreadRam.WeakOrGrow;
    let info: Chunk | null = null;

    for(const [hostname, size] of this.#servers) {
      const threads = Math.floor(size / per);

      if(threads >= min && (info == null || threads > info.threads))
        info = {hostname, threads};
    }

    return info;
  }

  /** Spawns or simulates a single job. */
  Spawn(ns: NS, hostname: string, job: Job, threads: number, once = false) {
    const per = this.#Per(job);
    let pids: number[] = [];
    let spawned = 0;

    while(spawned < threads) {
      const chunk = this.#Largest(job);

      if(chunk == null)
        break;

      const size = this.#servers.get(chunk.hostname);

      if(size == null)
        throw Impossible();

      let count = Math.min(chunk.threads, threads - spawned);

      spawned += count;
      count = this.#Cores(chunk.hostname, count);
      this.#servers.set(chunk.hostname, size - (count * per));

      if(!this.#simulate) {
        const pid = ns.exec(once ? OnceScript[job] : PermScript[job], chunk.hostname, count, hostname, GetID());

        if(pid === 0) {
          pids.forEach(id => ns.kill(id));
          pids = [];

          break;
        }else{
          pids.push(pid);
        }
      }
    }

    return pids;
  }

  /** Spawns or simulates an entire batch of jobs at once. */
  Batch(ns: NS, hostname: string, threads: Record<Job, number>) {
    let pids: Record<Job, number> | null = JobRecord(0);

    for(const job of Jobs) {
      const per = this.#Per(job);
      const chunk = this.#Largest(job, threads[job]);

      if(chunk == null) {
        Object.values(pids).forEach(id => ns.kill(id));
        pids = null;

        break;
      }else{
        const size = this.#servers.get(chunk.hostname);

        if(size == null)
          throw Impossible();

        const count = this.#Cores(chunk.hostname, threads[job]);

        this.#servers.set(chunk.hostname, size - (count * per));

        if(!this.#simulate) {
          const pid = ns.exec(PermScript[job], chunk.hostname, count, hostname, GetID());

          if(pid === 0) {
            Object.values(pids).forEach(id => ns.kill(id));
            pids = null;

            break;
          }else{
            pids[job] = pid;
          }
        }
      }
    }

    return pids;
  }
}
