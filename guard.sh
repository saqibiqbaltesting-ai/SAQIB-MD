#!/bin/sh
# SAQIB-MD guardian: bot ko foreground chalata hy, crash hone par 5s me restart.
# Schedule is script ko har 30 min par fire karta hy (timeout 1800000ms = poore window).
cd /workspace/wa-bot
echo "=== guard start $(date -u) ===" >> bot.log
while true; do
  /workspace/tools/node22/bin/node index.js 923106762478 >> bot.log 2>&1 &
  BOT_PID=$!
  echo "$BOT_PID" > bot.pid
  wait $BOT_PID
  echo "bot exited ($(date -u)), restart in 5s" >> bot.log
  sleep 5
done
