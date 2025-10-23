export function logError(error) {
    console.error('❌ Ошибка подключения к БД:');
    console.error(`   ошибка: ${JSON.stringify(error)}`);
    console.error(`   Сообщение: ${error.message}`);
    console.error(`   Код ошибки: ${error.code || 'N/A'}`);
    console.error(`   Детали: ${error.detail || 'N/A'}`);
    console.error(`   Hint: ${error.hint || 'N/A'}`);
}
export function logconnectionSetting(connectionSetting) {
    console.log('📋 Текущие настройки подключения:');
    console.log(`   Host: ${connectionSetting.host}`);
    console.log(`   Port: ${connectionSetting.port}`);
    console.log(`   Database: ${connectionSetting.database}`);
    console.log(`   User: ${connectionSetting.user}`);
    console.log(`   SSL: ${connectionSetting.ssl ? 'enabled' : 'disabled'}`);
}