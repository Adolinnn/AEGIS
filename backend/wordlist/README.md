# Wordlists

Gobuster reads its wordlist from here by default (`wordlist/common.txt`,
configured in `config/scanning.php` via `GOBUSTER_WORDLIST`).

`common.txt` is a small demo list so brute-forcing works out of the box.
Drop your own wordlist(s) in this folder and either:

- replace `common.txt` in place, or
- point `GOBUSTER_WORDLIST` in `.env` at a different file here, e.g.
  `GOBUSTER_WORDLIST=/path/to/aegis/wordlist/raft-medium-directories.txt`
