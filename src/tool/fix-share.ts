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
import {Color, ShareScript, SHARE_PERCENT} from "../util/const";

const {Default: D, Success: S} = Color;

export function FixShare(ns: NS, server: string) {
  if(ns.scriptRunning(ShareScript, server))
    ns.scriptKill(ShareScript, server);

  ns.exec(ShareScript, server, Math.floor(ns.getServerMaxRam(server) / 4 * SHARE_PERCENT));
}
export function main(ns: NS) {
  const servers = ns.getPurchasedServers();

  for(const server of servers)
    FixShare(ns, server);

  ns.tprint(`${D}Ran ${S}${ShareScript}${D} on ${servers.length} servers.`);
}
