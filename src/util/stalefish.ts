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
  Job, JobDuration, JOB_SPACER, HACK_LEVEL_RANGE
} from "./const";

interface Period {
  duration: number;
  depth: number;
}

export function GetBatchPeriod(ns: NS, target: string, limit: number) {
  const server = ns.getServer(target);
  const player = ns.getPlayer();

  server.hackDifficulty = server.minDifficulty;

  const maxHackT = ns.formulas.hacking.hackTime(server, player);
  const maxWeakT = maxHackT * JobDuration.Weak;
  const maxGrowT = maxHackT * JobDuration.Grow;

  player.skills.hacking += HACK_LEVEL_RANGE - 1;

  const minHackT = ns.formulas.hacking.hackTime(server, player);
  const minWeakT = minHackT * JobDuration.Weak;
  const minGrowT = minHackT * JobDuration.Grow;
  let result: Period | undefined;
  // Let the witchcraft begin!
  const kW_max = Math.min(Math.floor(((minWeakT - (4 * JOB_SPACER)) / (8 * JOB_SPACER)) + 1), limit);

  schedule: for(let kW = kW_max; kW >= 1; --kW) {
    const t_min_W = (maxWeakT + (JOB_SPACER * 4)) / kW;
    const t_max_W = (minWeakT - (JOB_SPACER * 4)) / (kW - 1);
    const kG_min = Math.ceil(Math.max((kW - 1) * 0.8, 1));
    const kG_max = Math.floor(1 + (kW * 0.8));

    for(let kG = kG_max; kG >= kG_min; --kG) {
      const t_min_G = (maxGrowT + (JOB_SPACER * 3)) / kG;
      const t_max_G = (minGrowT - (JOB_SPACER * 3)) / (kG - 1);
      const kH_min = Math.ceil(Math.max((kW - 1) * 0.25, (kG - 1) * 0.3125, 1));
      const kH_max = Math.floor(Math.min((kW * 0.25) + 1, (kG * 0.3125) + 1));

      for(let kH = kH_max; kH >= kH_min; --kH) {
        const t_min_H = (maxHackT + (JOB_SPACER * 5)) / kH;
        const t_max_H = (minHackT - JOB_SPACER) / (kH - 1);
        const t_min = Math.max(t_min_H, t_min_G, t_min_W);
        const t_max = Math.min(t_max_H, t_max_G, t_max_W);

        if(t_min <= t_max) {
          result = {duration: Math.round(t_min), depth: Math.floor(kW)};

          break schedule;
        }
      }
    }
  }

  return result;
}
export function GetJobDelays(ns: NS, target: string, period: Period): Record<Job, number> {
  const server = ns.getServer(target);
  const player = ns.getPlayer();

  server.hackDifficulty = server.minDifficulty;

  const hackT = ns.formulas.hacking.hackTime(server, player);
  const weakT = hackT * JobDuration.Weak;
  const growT = hackT * JobDuration.Grow;

  return {
    [Job.Hack]: (period.duration * period.depth) - (JOB_SPACER * 4) - hackT,
    [Job.Weak1]: (period.duration * period.depth) - (JOB_SPACER * 3) - weakT,
    [Job.Grow]: (period.duration * period.depth) - (JOB_SPACER * 2) - growT,
    [Job.Weak2]: (period.duration * period.depth) - JOB_SPACER - weakT
  };
}
