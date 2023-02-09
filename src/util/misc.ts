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
import {Job} from "./const";

export function ScanAll(ns: NS, root = "home", found = new Set<string>()) {
  found.add(root);

  for(const server of ns.scan(root)) {
    if(!found.has(server))
      ScanAll(ns, server, found);
  }

  return Array.from(found.values());
}
export function Impossible(): Error {
  return Error("So sad... this poor error will never see the light of day!");
}
export function GetID(reroll = (_: string) => false) {
  let id;

  do
    id = Math.random().toString(16).slice(2);
  while(reroll(id));

  return id;
}
export async function SleepPids(ns: NS, pids: number[]) {
  while(pids.some(pid => ns.getRunningScript(pid) != null))
    await ns.sleep(5);
}
export function JobRecord<T>(value: T): Record<Job, T> {
  return {
    [Job.Hack]: value,
    [Job.Weak1]: value,
    [Job.Grow]: value,
    [Job.Weak2]: value
  };
}
export function GetPercent(value: number) {
  return `${Math.floor(value * 1e4) / 100}%`;
}
