// Bootstrap script to invoke Hardhat CLI with allowNonlocalHardhatInstallation
import { main } from "./node_modules/hardhat/dist/src/internal/cli/main.js";

await main(process.argv.slice(2), {
  allowNonlocalHardhatInstallation: true,
});
