#!/bin/bash
termux-wake-lock

export VSCODE_PTY_HOST_GRACE_PERIOD=600000
export NODE_OPTIONS="--max-old-space-size=2048"
export VSCODE_EXTENSION_HOST_RECONNECTION_TIMEOUT=30000
export VSCODE_PTY_HOST_RECONNECTION_TIMEOUT=300000

rm -f ~/code-server.log
nohup code-server --bind-addr=127.0.0.1:1145 >> ~/code-server.log 2>&1 &

cd "$HOME/proxy" || exit
nohup node proxy.js >> ~/proxy.log 2>&1 &

disown