import { Command } from "commander";

import { registerBuildCommand } from "./commands/build.js";
import { registerExtractCommand } from "./commands/extract.js";
import { registerInfoCommand } from "./commands/info.js";
import { registerInitCommand } from "./commands/init.js";
import { registerInitConfigCommand } from "./commands/initConfig.js";
import { registerRepoCommand } from "./commands/repo.js";
import { registerValidateCommand } from "./commands/validate.js";
import { registerWorldBookCommand } from "./commands/worldBook.js";

export function registerCommands(program: Command): void {
  registerExtractCommand(program);
  registerInitCommand(program);
  registerRepoCommand(program);
  registerBuildCommand(program);
  registerWorldBookCommand(program);
  registerValidateCommand(program);
  registerInfoCommand(program);
  registerInitConfigCommand(program);
}
