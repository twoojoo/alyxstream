'use strict'

/** Redis default config */
export const RedisDefaultConfig = {
  port: 6379,
  host: '127.0.0.1',
  db: 0
}

/** Cassandra default config */
export const CassandraDefaultConfig = {
  contactPoints: ['localhost:9042'],
  localDataCenter: 'datacenter1',
  keyspace: 'alyxstream'
}

/** Postgres default config */
export const PgDefaultConfig = {
  user: 'alyxstream',
  host: 'localhost',
  database: 'alyxstream',
  password: '',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
}
