import { readdirSync, lstatSync } from 'node:fs'
import { resolve } from 'node:path'

export function postOrderDirectoryTraverse(dir, dirCallback, fileCallback) {
  for (const filename of readdirSync(dir)) {
    if (filename === '.git') {
      continue
    }
    const fullpath = resolve(dir, filename)
    if (lstatSync(fullpath).isDirectory()) {
      postOrderDirectoryTraverse(fullpath, dirCallback, fileCallback)
      dirCallback(fullpath)
      continue
    }
    fileCallback(fullpath)
  }
}

export const banner = '\x1B[38;2;66;211;146mV\x1B[39m\x1B[38;2;66;211;146mu\x1B[39m\x1B[38;2;66;211;146me\x1B[39m\x1B[38;2;66;211;146m.\x1B[39m\x1B[38;2;66;211;146mj\x1B[39m\x1B[38;2;67;209;149ms\x1B[39m \x1B[38;2;68;206;152m-\x1B[39m \x1B[38;2;69;204;155mT\x1B[39m\x1B[38;2;70;201;158mh\x1B[39m\x1B[38;2;71;199;162me\x1B[39m \x1B[38;2;72;196;165mP\x1B[39m\x1B[38;2;73;194;168mr\x1B[39m\x1B[38;2;74;192;171mo\x1B[39m\x1B[38;2;75;189;174mg\x1B[39m\x1B[38;2;76;187;177mr\x1B[39m\x1B[38;2;77;184;180me\x1B[39m\x1B[38;2;78;182;183ms\x1B[39m\x1B[38;2;79;179;186ms\x1B[39m\x1B[38;2;80;177;190mi\x1B[39m\x1B[38;2;81;175;193mv\x1B[39m\x1B[38;2;82;172;196me\x1B[39m \x1B[38;2;83;170;199mJ\x1B[39m\x1B[38;2;83;167;202ma\x1B[39m\x1B[38;2;84;165;205mv\x1B[39m\x1B[38;2;85;162;208ma\x1B[39m\x1B[38;2;86;160;211mS\x1B[39m\x1B[38;2;87;158;215mc\x1B[39m\x1B[38;2;88;155;218mr\x1B[39m\x1B[38;2;89;153;221mi\x1B[39m\x1B[38;2;90;150;224mp\x1B[39m\x1B[38;2;91;148;227mt\x1B[39m \x1B[38;2;92;145;230mF\x1B[39m\x1B[38;2;93;143;233mr\x1B[39m\x1B[38;2;94;141;236ma\x1B[39m\x1B[38;2;95;138;239mm\x1B[39m\x1B[38;2;96;136;243me\x1B[39m\x1B[38;2;97;133;246mw\x1B[39m\x1B[38;2;98;131;249mo\x1B[39m\x1B[38;2;99;128;252mr\x1B[39m\x1B[38;2;100;126;255mk\x1B[39m'