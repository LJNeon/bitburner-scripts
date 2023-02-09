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
import {Color, PORT_PROGRAMS} from "../util/const";
import {ScanAll} from "../util/misc";

function GetStatus(ns: NS) {
  const programs = PORT_PROGRAMS.filter(program => ns.fileExists(program));
  const locked = ScanAll(ns).filter(hostname => !ns.hasRootAccess(hostname));
  const openable = locked.filter(hostname => ns.getServerNumPortsRequired(hostname) <= programs.length);

  return {programs, locked: locked.length, openable};
}

export async function main(ns: NS) {
  ns.disableLog("ALL");

  const scripts = ns.ls("home", "bin");
  let {programs, locked, openable} = GetStatus(ns);

  do {
    for(const hostname of openable) {
      if(programs.includes("BruteSSH.exe"))
        ns.brutessh(hostname);

      if(programs.includes("FTPCrack.exe"))
        ns.ftpcrack(hostname);

      if(programs.includes("relaySMTP.exe"))
        ns.relaysmtp(hostname);

      if(programs.includes("HTTPWorm.exe"))
        ns.httpworm(hostname);

      if(programs.includes("SQLInject.exe"))
        ns.sqlinject(hostname);

      ns.nuke(hostname);

      if(ns.getServerMaxRam(hostname) > 0)
        ns.scp(scripts, hostname);
    }

    if(openable.length > 0)
      ns.print(`${Color.Default}Gained root access to ${openable.length} server${openable.length === 1 ? "" : "s"}.`);

    await ns.sleep(1e3);
  }while({programs, locked, openable} = GetStatus(ns), locked > 0);
}
