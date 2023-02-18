/*!
 * LJ's Bitburner Scripts
 * Copyright (C) 2022 ElJay#7711
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
import {NS, Server, Player} from "@ns";
import {
  Job, ThreadSecurity, JobDuration, JOB_SPACER,
  HACK_LEVEL_RANGE, LEECH_PERCENTS
} from "./const";
import {ScanAll} from "./misc";
import RAM from "./ram";
import {GetBatchPeriod} from "./stalefish";

export function GetWeakThreads(security: number) {
  return Math.ceil(security / ThreadSecurity.Weak);
}
export function GetGrowThreads(ns: NS, server: Server, player: Player) {
  if(server.moneyAvailable >= server.moneyMax)
    return 0;

  const base = Math.log(ns.formulas.hacking.growPercent(server, 1, player, 1));
  let threads = 1000;
  let prev = threads;

  for(let i = 0; i < 30; ++i) {
    const factor = server.moneyMax / Math.min(server.moneyAvailable + threads, server.moneyMax - 1);

    threads = Math.log(factor) / base;

    if(Math.ceil(threads) === Math.ceil(prev))
      break;

    prev = threads;
  }

  return Math.ceil(Math.ceil(Math.max(threads, prev, 0)) * 1.01);
}
export function GetHackThreads(ns: NS, server: Server, player: Player, leech: number) {
  return Math.floor(leech / ns.formulas.hacking.hackPercent(server, player));
}
export function GetThreads(ns: NS, hostname: string, leech: number): Record<Job, number> {
  const server = ns.getServer(hostname);
  const player = ns.getPlayer();

  server.hackDifficulty = server.minDifficulty;
  server.moneyAvailable = server.moneyMax;

  const hackThreads = GetHackThreads(ns, server, player, leech);

  server.moneyAvailable -= server.moneyMax * leech;

  const growThreads = GetGrowThreads(ns, server, player);

  return {
    [Job.Hack]: hackThreads,
    [Job.Weak1]: GetWeakThreads(hackThreads * ThreadSecurity.Hack),
    [Job.Grow]: growThreads,
    [Job.Weak2]: GetWeakThreads(growThreads * ThreadSecurity.Grow)
  };
}

function GetDepthLimit(ns: NS, hostname: string, leech: number) {
  const server = ns.getServer(hostname);
  const player = ns.getPlayer();

  server.hackDifficulty = server.minDifficulty;
  player.skills.hacking += HACK_LEVEL_RANGE - 1;

  const weakT = ns.formulas.hacking.hackTime(server, player) * JobDuration.Weak;
  const limit = Math.floor(weakT / (JOB_SPACER * 8));
  const ram = new RAM(ns, true);
  const threads = GetThreads(ns, hostname, leech);
  let depth = 0;

  for(; depth < limit; depth++) {
    if(ram.Batch(ns, hostname, threads) == null)
      break;
  }

  return depth;
}

export interface Metrics {
  hostname: string;
  profit: number;
  leech: number;
  duration: number;
  depth: number;
}
export function GetServerMetrics(ns: NS, hostname: string) {
  let metrics: Metrics | undefined;

  for(const leech of LEECH_PERCENTS) {
    const limit = GetDepthLimit(ns, hostname, leech);

    if(limit === 0)
      break;

    const server = ns.getServer(hostname);

    server.hackDifficulty = server.minDifficulty;

    const chance = ns.formulas.hacking.hackChance(server, ns.getPlayer());
    const period = GetBatchPeriod(ns, hostname, limit);

    if(period == null || period.duration < JOB_SPACER * 8)
      break;

    const profit = server.moneyMax * leech * chance * 6e4 / period.duration;

    if(metrics == null || profit > metrics.profit) {
      metrics = {
        hostname,
        profit,
        leech,
        duration: period.duration,
        depth: period.depth
      };
    }
  }

  return metrics;
}

function IsDefined<T>(t: T | undefined): t is T {
  return t != null;
}

export function GetProfitServers(ns: NS, count = 1) {
  return ScanAll(ns)
    .map(hostname => ns.getServer(hostname))
    .filter(server => server.hasAdminRights && server.moneyMax > 0)
    .map(server => GetServerMetrics(ns, server.hostname))
    .filter(IsDefined)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, count);
}
export function GetXPServer(ns: NS) {
  const servers = ScanAll(ns).map(hostname => ns.getServer(hostname)).filter(server => server.hasAdminRights);
  const player = ns.getPlayer();
  let hostname: string | undefined;
  let bestScore: number | undefined;

  for(const server of servers) {
    server.hackDifficulty = server.minDifficulty;

    const score = ns.formulas.hacking.hackExp(server, player) / ns.formulas.hacking.growTime(server, player);

    if(bestScore == null || score > bestScore) {
      hostname = server.hostname;
      bestScore = score;
    }
  }

  return hostname;
}
