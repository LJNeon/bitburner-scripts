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
export enum Color {
  Default = "\u001b[38;5;250m",
  Info = "\u001b[38;5;116m",
  Success = "\u001b[38;5;78m",
  Warn = "\u001b[38;5;185m",
  Fail = "\u001b[38;5;203m",
  Reset = "\u001b[0m"
}
export enum Port {
  Online = 1,
  Controller = 2,
  Workers = 3
}
export enum OP {
  Online = 0,
  Finished = 1
}
export enum Stage {
  Running = 0,
  Stopping = 1,
  Stopped = 2
}
export enum Job {
  Hack = "Hack",
  Weak1 = "Weak1",
  Grow = "Grow",
  Weak2 = "Weak2"
}
export const Jobs = [Job.Hack, Job.Weak1, Job.Grow, Job.Weak2];
export const PermScript: Record<Job, string> = {
  [Job.Hack]: "/bin/hack.js",
  [Job.Weak1]: "/bin/weak.js",
  [Job.Grow]: "/bin/grow.js",
  [Job.Weak2]: "/bin/weak.js"
};
export const OnceScript: Record<Job, string> = {
  [Job.Hack]: "/bin/hack-once.js",
  [Job.Weak1]: "/bin/weak-once.js",
  [Job.Grow]: "/bin/grow-once.js",
  [Job.Weak2]: "/bin/weak-once.js"
};
export const ShareScript = "/bin/share.js";
export enum ThreadRam {
  WeakOrGrow = 1.75,
  Hack = 1.7
}
export enum ThreadSecurity {
  Weak = 0.05,
  Grow = 0.004,
  Hack = 0.002
}
export enum JobDuration {
  Weak = 4,
  Grow = 3.2,
  Hack = 1
}
export const JOB_SPACER = 15;
export const SAFE_THRESHOLD = 10;
export const HACK_LEVEL_RANGE = 10;
export const MIN_HOME_RAM = 16;
export const SHARE_PERCENT = 0.25;
export const PRINT_SPACER = 250;
export const LEECH_PERCENTS = [
  0.0100, 0.0290, 0.0541, 0.0842, 0.1187, 0.1571, 0.1991, 0.2445, 0.2930, 0.3445,
  0.3989, 0.4560, 0.5157, 0.5779, 0.6426, 0.7096, 0.7789, 0.8505, 0.9242, 1.0000
];
export const JOB_ORDER = [
  [Job.Hack, Job.Weak1, Job.Grow, Job.Weak2],
  [Job.Weak1, Job.Grow, Job.Weak2],
  [Job.Weak1, Job.Weak2]
];
export const NORMAL_ABBRS = ["", "k", "m", "b", "t", "q", "Q", "s", "S", "o", "n", "d"];
export const BYTE_ABBRS = ["b", "kB", "GB", "TB", "PB", "EB", "ZB", "YB"];
