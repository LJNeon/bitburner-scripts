/*!
 * LJ's Bitburner Scripts
 * Copyright (C) 3 ElJay#7711
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
  Color, Job, OP, Port
} from "../util/const";
import RAM from "../util/ram";
import {GetXPServer} from "../util/stat";

export async function main(ns: NS) {
  ns.disableLog("ALL");
  ns.clearLog();
  ns.tail();

  const hostname = GetXPServer(ns);

  if(hostname == null)
    return ns.tprint(`${Color.Default}No hackable servers found.`);

  const pids: number[] = [];

  ns.atExit(() => {
    pids.forEach(pid => ns.kill(pid));
    ns.clearPort(Port.Online);
  });
  ns.print(`${Color.Warn}Preparing...`);
  await Prepare(ns, hostname);

  const ram = new RAM(ns);

  ns.writePort(Port.Online, OP.Online);
  pids.push(...ram.Spawn(ns, hostname, Job.Grow, Number.MAX_SAFE_INTEGER));
  await Promise.race([Promise.all(pids.map(pid => ns.getPortHandle(pid + Port.Offset).nextWrite())), ns.asleep(1e4)]);

  if(pids.filter(pid => ns.readPort(pid + Port.Offset) !== OP.Online).length !== 0)
    throw Error("Some workers failed to respond as online.");

  while(true) {
    const grows = [];

    for(const pid of pids) {
      const port = ns.getPortHandle(pid + Port.Offset);

      port.write(OP.Start);
      grows.push(port.nextWrite());
    }

    await Promise.all(grows);
    ns.print(`${Color.Success}Grown!`);
  }
}
