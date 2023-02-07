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

import {NS} from "@ns";
import {Color, ShareScript, SHARE_PERCENT} from "../util/const";
import {FixShare} from "./fix-share";

export async function main(ns: NS) {
  ns.disableLog("ALL");

  const scripts = ns.ls("home", "bin").concat(ns.ls("home", "util"));
  const limit = ns.getPurchasedServerLimit();
  const maxSize = Math.log2(ns.getPurchasedServerMaxRam());
  const shareRam = ns.getScriptRam(ShareScript);

  while(true) {
    const servers = ns.getPurchasedServers();
    const money = ns.getServerMoneyAvailable("home");

    if(servers.length < limit) {
      for(let i = 6; i >= 1; i--) {
        const ram = Math.pow(2, i);
        const cost = ns.getPurchasedServerCost(ram);

        if(cost <= money) {
          const hostname = `server-${String(servers.length + 1).padStart(2, "0")}`;

          ns.purchaseServer(hostname, ram);
          ns.scp(scripts, hostname);
          ns.exec(ShareScript, hostname, Math.floor(ram * SHARE_PERCENT / shareRam));
          ns.print(`${Color.Success}Purchased "${hostname}" with ${ns.nFormat(ram * 1e9, "0.00b")} RAM.`);

          break;
        }
      }
    }else{
      servers.sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b));

      const hostname = servers.shift();

      if(hostname == null)
        return;

      const current = ns.getServerMaxRam(hostname);

      if(current === Math.pow(2, maxSize))
        return;

      for(let i = maxSize; i >= 1; i--) {
        const ram = Math.pow(2, i);
        const cost = ns.getPurchasedServerUpgradeCost(hostname, ram);

        if(cost <= money && ram > current) {
          ns.upgradePurchasedServer(hostname, ram);
          FixShare(ns, hostname);
          ns.print(`${Color.Info}Upgraded "${hostname}" to ${ns.nFormat(ram * 1e9, "0.00b")} RAM.`);

          break;
        }
      }
    }

    await ns.sleep(1e3);
  }
}
