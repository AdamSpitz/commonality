#!/bin/bash

COMMONALITY_DIR="."
SESSION_NAME="commonality"

# Check if session exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Session $SESSION_NAME exists, attaching..."
    tmux attach-session -t "$SESSION_NAME"
else
  tmux new-session -d -s "$SESSION_NAME" -n hardhat

  tmux send-keys -t "$SESSION_NAME":hardhat "cd $COMMONALITY_DIR/hardhat" Enter

  tmux new-window -t "$SESSION_NAME" -n hardhat2
  tmux send-keys -t "$SESSION_NAME":hardhat2 "cd $COMMONALITY_DIR/hardhat" Enter

  tmux new-window -t "$SESSION_NAME" -n indexer
  tmux send-keys -t "$SESSION_NAME":indexer "cd $COMMONALITY_DIR/indexer" Enter

  tmux new-window -t "$SESSION_NAME" -n integration-tests
  tmux send-keys -t "$SESSION_NAME":integration-tests "cd $COMMONALITY_DIR/integration-tests" Enter

  tmux attach-session -t "$SESSION_NAME"
fi
