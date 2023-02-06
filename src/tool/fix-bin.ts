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
import {ScanAll} from "../util/misc";

const {Default: D, Success: S} = Color;

export function main(ns: NS) {
  ns.disableLog("ALL");

  const scripts = ns.ls("home", "bin").concat(ns.ls("home", "util"));
  const servers = ScanAll(ns).filter(hostname => ns.hasRootAccess(hostname));

  for(const hostname of servers)
    ns.scp(scripts, hostname);

  ns.tprint(`${D}Updated ${S}/bin/${D} and ${S}/util/${D} for ${servers.length} servers.`);
}
