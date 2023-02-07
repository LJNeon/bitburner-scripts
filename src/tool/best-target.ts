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
import {Color} from "../util/const";
import {GetProfitServers, GetXPServer} from "../util/stat";

export function main(ns: NS) {
  ns.disableLog("ALL");

  const hacking = GetProfitServers(ns, 5);
  const xp = GetXPServer(ns);

  if(hacking.length === 0 || xp == null)
    return ns.tprint(`${Color.Default}No targetable servers found.`);

  let message = `\n${Color.Info}Best Servers for Profit:`;
  let i = 0;

  for(const target of hacking) {
    message += `\n${Color.Info}${++i}. ${Color.Default}${target.hostname}`;
    message += ` at ${ns.nFormat(target.leech * 100, "0.0")}% for $${ns.nFormat(target.profit, "0.00a")}/min`;
  }

  message += `\n\n${Color.Success}Best Server for XP:\n1. ${Color.Default}${xp}`;
  ns.tprint(message);
}
