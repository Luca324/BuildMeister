export default function logImportData(totalImported, importDir) {
	console.log('\n📊 Детальная статистика импорта:')
	console.log(`   📁 Директория: ${importDir}`)
	console.log(`   📈 Всего импортировано: ${totalImported} записей`)
	console.log(`   ⏰ Время завершения: ${new Date().toLocaleString('ru-RU')}`)
}
