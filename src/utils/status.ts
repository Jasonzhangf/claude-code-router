import { getServiceInfo } from './processCheck';
import { version } from '../../package.json';

export async function showStatus() {
    const info = await getServiceInfo();
    
    console.log('\n📊 Claude Code Router Enhanced Status');
    console.log(`🚀 Version: ${version}`);
    console.log('═'.repeat(50));
    
    if (info.running) {
        console.log('✅ Status: Running');
        console.log(`🆔 Process ID: ${info.pid}`);
        console.log(`🌐 Port: ${info.port}`);
        console.log(`📡 API Endpoint: ${info.endpoint}`);
        console.log(`📄 PID File: ${info.pidFile}`);
        console.log('');
        console.log('🚀 Ready to use! Run the following commands:');
        console.log('   ccr code    # Start coding with Claude');
        console.log('   ccr stop   # Stop the service');
    } else {
        console.log('❌ Status: Not Running');
        console.log('');
        console.log('💡 To start the service:');
        console.log('   ccr start');
    }
    
    console.log('');
}
