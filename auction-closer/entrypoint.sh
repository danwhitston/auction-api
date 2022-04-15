#!/bin/bash
# Based on Kulatunga (2021)

env >> /etc/environment

# execute CMD
echo "$@"
exec "$@"