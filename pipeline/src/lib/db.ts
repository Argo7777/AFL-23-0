import Database from "better-sqlite3";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = join(__dirname, "..", "..", "data.sqlite");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS season_stats (
  player_key TEXT NOT NULL,        -- afltables player page path, e.g. players/R/Rory_Laird.html
  player_name TEXT NOT NULL,       -- "Laird, Rory"
  team TEXT NOT NULL,              -- afltables team name as printed
  year INTEGER NOT NULL,
  gm INTEGER, ki INTEGER, mk INTEGER, hb INTEGER, di INTEGER,
  gl INTEGER, bh INTEGER, ho INTEGER, tk INTEGER, rb INTEGER,
  i5 INTEGER, cl INTEGER, cg INTEGER, ff INTEGER, fa INTEGER,
  br INTEGER, cp INTEGER, up INTEGER, cm INTEGER, mi INTEGER,
  op INTEGER, bo INTEGER, ga INTEGER, pp REAL,
  PRIMARY KEY (player_key, team, year)
);

CREATE TABLE IF NOT EXISTS matches (
  match_num INTEGER PRIMARY KEY,   -- chronological number from bg3.txt
  date TEXT NOT NULL,
  year INTEGER NOT NULL,
  round TEXT NOT NULL,             -- R1..R24, QF, EF, SF, PF, GF
  team1 TEXT NOT NULL, score1 INTEGER NOT NULL,
  team2 TEXT NOT NULL, score2 INTEGER NOT NULL,
  venue TEXT
);

CREATE TABLE IF NOT EXISTS gf_players (
  year INTEGER NOT NULL,
  team TEXT NOT NULL,
  player_name TEXT NOT NULL,       -- "Surname, First" (afltables format)
  premiers INTEGER NOT NULL,       -- 1 if this team won the flag
  PRIMARY KEY (year, team, player_name)
);

CREATE TABLE IF NOT EXISTS aflw_matches (
  match_id TEXT PRIMARY KEY,       -- AFL API provider match id
  season_key TEXT NOT NULL,        -- "2025", "2022-s6", "2022-s7" (2022 ran twice)
  label TEXT NOT NULL,             -- display label e.g. "2022 S7"
  date TEXT NOT NULL,              -- "8-Nov-2025" (Melbourne local)
  year INTEGER NOT NULL,           -- calendar year (sort/era)
  round TEXT NOT NULL,             -- R1..R12, EF/SF/PF/GF
  team1 TEXT NOT NULL, score1 INTEGER NOT NULL,
  team2 TEXT NOT NULL, score2 INTEGER NOT NULL,
  venue TEXT
);

CREATE TABLE IF NOT EXISTS afl_match_meta (
  mid INTEGER PRIMARY KEY,          -- footywire match id
  year INTEGER NOT NULL,
  round TEXT NOT NULL,              -- "Round 1" / "Grand Final" (footywire label)
  home TEXT NOT NULL, away TEXT NOT NULL,
  hscore INTEGER, ascore INTEGER,
  venue TEXT, date TEXT             -- "Thu 14 Mar 7:30pm"
);
CREATE INDEX IF NOT EXISTS idx_afl_match_meta_year ON afl_match_meta(year);

CREATE TABLE IF NOT EXISTS afl_match_player_stats (
  mid INTEGER NOT NULL,
  team TEXT NOT NULL,               -- footywire team name
  name TEXT NOT NULL,               -- "Patrick Cripps"
  kk INTEGER, hb INTEGER, di INTEGER, mk INTEGER, gl INTEGER, bh INTEGER,
  tk INTEGER, ho INTEGER, ga INTEGER, i5 INTEGER, cl INTEGER, cg INTEGER,
  r5 INTEGER, ff INTEGER, fa INTEGER, af INTEGER, sc INTEGER,
  PRIMARY KEY (mid, name)
);
CREATE INDEX IF NOT EXISTS idx_afl_mps_mid ON afl_match_player_stats(mid);

CREATE TABLE IF NOT EXISTS aflw_player_games (
  match_id TEXT NOT NULL,
  season_key TEXT NOT NULL,
  year INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  team TEXT NOT NULL,            -- canonical club
  position TEXT,                 -- on-day position code (FB, C, RK, FF, INT...)
  gl REAL, kk REAL, hb REAL, di REAL, mk REAL, tk REAL, cp REAL,
  i5 REAL, mi5 REAL, cm REAL, ho REAL, op REAL, cl REAL, r5 REAL,
  ic REAL, ga REAL, mg REAL, rp REAL,
  PRIMARY KEY (match_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_aflwpg_season ON aflw_player_games(season_key);

CREATE TABLE IF NOT EXISTS brownlow (
  year INTEGER NOT NULL,
  player_name TEXT NOT NULL,       -- "First Last" (footywire format)
  team TEXT NOT NULL,              -- footywire club slug from profile link
  votes INTEGER NOT NULL,
  v3 INTEGER, v2 INTEGER, v1 INTEGER,
  played INTEGER, polled INTEGER,
  winner INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (year, player_name, team)
);

CREATE TABLE IF NOT EXISTS all_australian (
  year INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  pos TEXT,                        -- AA line: FB/HB/C/HF/FF/Foll/IC
  PRIMARY KEY (year, player_name)
);

CREATE TABLE IF NOT EXISTS rising_star (
  year INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team TEXT NOT NULL,
  winner INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (year, player_name)
);

CREATE TABLE IF NOT EXISTS fw_profiles (
  slug TEXT PRIMARY KEY,           -- pp-{club}--{player} path segment
  name TEXT,
  club_slug TEXT,
  position TEXT,                   -- raw footywire string, e.g. "Midfield, Forward"
  height_cm INTEGER,
  weight_kg INTEGER,
  games INTEGER
);

CREATE TABLE IF NOT EXISTS wd_positions (
  name TEXT NOT NULL,              -- lowercase "first last"
  birth_year INTEGER,
  position TEXT NOT NULL,          -- wikidata position label
  PRIMARY KEY (name, position)
);

CREATE INDEX IF NOT EXISTS idx_season_stats_year ON season_stats(year);
CREATE INDEX IF NOT EXISTS idx_season_stats_player ON season_stats(player_key);
CREATE INDEX IF NOT EXISTS idx_matches_year ON matches(year);
`);

// migrations for tables created before a column was added
try {
  db.exec(`ALTER TABLE all_australian ADD COLUMN pos TEXT`);
} catch {
  // column already exists
}

