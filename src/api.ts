import { environment } from "@raycast/api";
import { Item } from "./types";
import { promisify } from "util";
import { exec } from "child_process";
import { URL } from "url";
import { faviconUrl } from "./utils";
import crypto from "crypto";
import pbkdf2Hmac from "pbkdf2-hmac";

const asyncExec = promisify(exec);
const asyncPbkdf2 = promisify(crypto.pbkdf2);
const scriptPath = environment.assetsPath + "/main.py";

export class ChromeDecryptor {
  async listItems(): Promise<Item[]> {
    const { stdout } = await asyncExec(`/usr/bin/python3 ${scriptPath}`);
    const items: [{ url: string; username: string; password: string; }] = JSON.parse(stdout);
    return items.map((item) => { 
      let obj: Item = { 
        url: new URL(item.url).hostname, 
        username: item.username, 
        password: item.password, 
        faviconUrl: faviconUrl(64, item.url)
      };
      return obj;
    });
  }

  async chromePasswords() {
    // native_key b'MQKcwAY3ChqZ45mPGgo+YA=='
    // iv 20202020202020202020202020202020
    // aes_key b'(!\xee\xc1\x8c\x10\xf2\xcf\xb0\x9b\x0e\xef\x08T\xa5)'
    var nativeKey = await this.getEncryptionKey();
    nativeKey = nativeKey.replaceAll('"', '');
    nativeKey = Buffer.from(nativeKey, 'utf-8').toString()
    console.warn("nativeKey", nativeKey);

    const iv = '20'.repeat(16);
    console.warn("iv", iv);

    const aesKey = await asyncPbkdf2(nativeKey, 'saltysalt', 1003, 16, 'sha1');
    console.warn("aesKey", aesKey.toString('base64'));

    const iv2 = new Array(17).join(' ');
    const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, iv2);
    console.warn(decipher);
  }

  async getEncryptionKey() {
    const { stdout } = await asyncExec(`security 2>&1 > /dev/null find-generic-password -ga 'Chrome' | awk '{print $2}'`);
    return stdout;
  }
}