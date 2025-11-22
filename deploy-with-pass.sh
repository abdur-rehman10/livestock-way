#!/usr/bin/expect -f

set password "YC9K2u33dW539W9it4O06Q"

spawn ssh root@62.146.228.61 "bash /root/deploy.sh"
expect "password:"
send "$password\r"
interact

