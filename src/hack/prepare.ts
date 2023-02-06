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

import {NS, Server} from "@ns";
import {Job} from "../util/const";
import {GetGrowThreads, GetWeakThreads} from "../util/stat";
import {SleepPids} from "../util/misc";
import RAM from "../util/ram";

function Prepared(server: Server) {
  return server.hackDifficulty === server.minDifficulty && server.moneyAvailable === server.moneyMax;
}

export default async function Prepare(ns: NS, hostname: string) {
  let server: Server;

  while(!Prepared(server = ns.getServer(hostname))) {
    const ram = new RAM(ns);
    const pids: number[] = [];

    if(server.hackDifficulty !== server.minDifficulty) {
      pids.push(...ram.Spawn(
        ns,
        hostname,
        Job.Weak1,
        GetWeakThreads(server.hackDifficulty - server.minDifficulty),
        true
      ));
    }

    if(server.moneyAvailable !== server.moneyMax) {
      pids.push(...ram.Spawn(
        ns,
        hostname,
        Job.Grow,
        GetGrowThreads(ns, server, ns.getPlayer()),
        true
      ));
    }

    await SleepPids(ns, pids);
  }
}
