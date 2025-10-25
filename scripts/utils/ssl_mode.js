import fs from 'fs'

import { connectionSetting } from '../db-connection.js'

export default function setSslMode(sslMode) {
	switch (sslMode) {
	case 'disable': {
		connectionSetting.ssl = false
		break
	}
	case 'require':
	case 'prefer':
	case 'verify-ca':
	case 'verify-full': {
		const ssl = {
			rejectUnauthorized: true,
		}
		const ca = process.env.DB_SSLROOTCERT
		if (ca) {
			ssl.ca = fs.readFileSync(ca).toString()
		}
		const cert = process.env.DB_SSLCERT
		if (cert) {
			ssl.cert = fs.readFileSync(cert).toString()
		}
		const key = process.env.DB_SSLKEY
		if (key) {
			ssl.key = fs.readFileSync(key).toString()
		}
		connectionSetting.ssl = ssl
		break
	}
	case 'no-verify': {
		connectionSetting.ssl = {
			rejectUnauthorized: false,
		}
		break
	}
	default: {
		connectionSetting.ssl = false
		break
	}
	}
}
