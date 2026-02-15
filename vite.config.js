import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

function copyStaticAssetsPlugin() {
  const rootDir = process.cwd();
  const sourceDir = path.resolve(rootDir, "static");
  const targetDirs = [
    path.resolve(rootDir, "dist/dev/mp-weixin/static"),
    path.resolve(rootDir, "dist/build/mp-weixin/static")
  ];

  const copyStatic = () => {
    if (!fs.existsSync(sourceDir)) {
      return;
    }

    for (const targetDir of targetDirs) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(targetDir), { recursive: true });
      fs.cpSync(sourceDir, targetDir, { recursive: true });
    }
  };

  return {
    name: "copy-static-assets-plugin",
    buildStart() {
      copyStatic();
    },
    writeBundle() {
      copyStatic();
    }
  };
}

export default defineConfig({
  plugins: [uni(), copyStaticAssetsPlugin()]
});
