import { registerBuildCommand } from "./commands/build.js";
import { registerExtractCommand } from "./commands/extract.js";
import { registerInfoCommand } from "./commands/info.js";
import { registerInitConfigCommand } from "./commands/initConfig.js";
import { registerRepoCommand } from "./commands/repo.js";
import { registerValidateCommand } from "./commands/validate.js";
export function registerCommands(program) {
    registerExtractCommand(program);
    registerRepoCommand(program);
    registerBuildCommand(program);
    registerValidateCommand(program);
    registerInfoCommand(program);
    registerInitConfigCommand(program);
}
