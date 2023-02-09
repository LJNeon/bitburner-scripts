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
import {Port, OP} from "../util/const";

export async function main(ns: NS) {
  if(ns.peek(Port.Online) !== OP.Online)
    return;

  const ws = ns.getPortHandle(ns.pid + Port.Offset);

  ws.write(OP.Online);

  while(true) {
    await ws.nextWrite();
    ws.read();
    await ns.grow(String(ns.args[0]));
    ws.write(OP.Finished);
  }
}
