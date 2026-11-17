#!/usr/bin/env bash
# Switches www.otosanayide.com between the Nuxt app and the static "Pek yakında" page.
#
#   deploy/coming-soon.sh on  [ssh-host]   # page on, Node service stopped
#   deploy/coming-soon.sh off [ssh-host]   # Node service started, app back
#
# Default host: odit-01 (root). One SSH connection per run.
#
# on:  copies deploy/coming-soon/ to /var/www/otosanayide-coming-soon and the nginx conf to
#      sites-available/otosanayide.com.coming-soon, points the enabled www.otosanayide.com
#      entry at it (backup in /root/nginx-backup-*), runs nginx -t (restores on failure),
#      reloads nginx, then stops and disables otosanayide-web.
# off: starts otosanayide-web, waits for port 3000, points the entry back at the live conf
#      recorded by "on", runs nginx -t and reloads.
set -euo pipefail

mode=${1:-}
host=${2:-odit-01}
here=$(cd "$(dirname "$0")" && pwd)

remote_common='
set -euo pipefail
state=/root/otosanayide-coming-soon.state
service=otosanayide-web
has_unit() { systemctl cat "$service" >/dev/null 2>&1; }
'

remote_on="$remote_common"'
tmp=$(mktemp -d)
tar -xzf - -C "$tmp"

if [ -f "$state" ]; then
  . "$state"
else
  matches=$(grep -lE "server_name[^;]*[[:space:]]www\.otosanayide\.com[;[:space:]]" /etc/nginx/sites-enabled/* || true)
  if [ "$(printf "%s\n" "$matches" | grep -c .)" != 1 ]; then
    echo "Expected one sites-enabled file for www.otosanayide.com, found: ${matches:-none}" >&2
    exit 1
  fi
  enabled=$matches
  backup=/root/nginx-backup-$(date +%Y%m%d-%H%M%S)
  mkdir -p "$backup"
  cp -a "$enabled" "$backup/"
  if [ -L "$enabled" ]; then
    live=$(readlink -f "$enabled")
  else
    live=/etc/nginx/sites-available/otosanayide.com.live
    cp -a "$enabled" "$live"
  fi
  printf "enabled=%q\nlive=%q\n" "$enabled" "$live" > "$state"
  echo "Live conf: $live (backup in $backup)"
fi

rm -rf /var/www/otosanayide-coming-soon
cp -r "$tmp/coming-soon" /var/www/otosanayide-coming-soon
chown -R root:root /var/www/otosanayide-coming-soon
chmod -R a+rX /var/www/otosanayide-coming-soon
install -m 644 "$tmp/nginx/otosanayide.com.coming-soon.conf" /etc/nginx/sites-available/otosanayide.com.coming-soon
rm -rf "$tmp"

ln -sfn /etc/nginx/sites-available/otosanayide.com.coming-soon "$enabled"
if ! nginx -t; then
  ln -sfn "$live" "$enabled"
  echo "nginx -t failed; live conf restored, nothing reloaded." >&2
  exit 1
fi
systemctl reload nginx
echo "nginx now serves the coming-soon page."

if has_unit; then
  systemctl disable --now "$service"
  echo "$service stopped and disabled."
else
  echo "No $service unit; check what still listens on 3000:" >&2
  ss -ltnp "sport = :3000" >&2 || true
fi
'

remote_off="$remote_common"'
if [ ! -f "$state" ]; then
  echo "No $state; coming-soon was not switched on by this script." >&2
  exit 1
fi
. "$state"

if has_unit; then
  systemctl enable --now "$service"
  for _ in $(seq 1 30); do
    curl -fsS -o /dev/null http://127.0.0.1:3000/ && break
    sleep 1
  done
  curl -fsS -o /dev/null http://127.0.0.1:3000/ || { echo "Node did not answer on 3000; nginx left on coming-soon." >&2; exit 1; }
fi

ln -sfn "$live" "$enabled"
if ! nginx -t; then
  ln -sfn /etc/nginx/sites-available/otosanayide.com.coming-soon "$enabled"
  echo "nginx -t failed; coming-soon conf restored." >&2
  exit 1
fi
systemctl reload nginx
rm -f "$state"
echo "Site is back on the Nuxt app."
'

case "$mode" in
  on)
    COPYFILE_DISABLE=1 tar -C "$here" -czf - coming-soon nginx/otosanayide.com.coming-soon.conf | ssh "$host" "bash -c $(printf %q "$remote_on")"
    ;;
  off)
    ssh "$host" "bash -c $(printf %q "$remote_off")"
    ;;
  *)
    echo "usage: $0 on|off [ssh-host]" >&2
    exit 2
    ;;
esac
