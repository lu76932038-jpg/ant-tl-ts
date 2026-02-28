const path = require('path');
require('ts-node').register({
  project: path.join(__dirname, 'server', 'tsconfig.json')
});

const pool = require('./server/src/config/database').default;
const { UserModel } = require('./server/src/models/User');

async function testUpdate() {
    try {
        console.log('Fetching all users...');
        const users = await UserModel.findAll();
        if (users.length === 0) {
            console.log('No users found.');
            return;
        }
        
        const targetUser = users[0];
        console.log('Target user before update:', targetUser);
        
        const newPassword = `testpass_${Date.now()}`;
        console.log(`Updating password to ${newPassword}...`);
        
        await UserModel.update(targetUser.id, { password: newPassword });
        
        const updatedUser = await UserModel.findById(targetUser.id);
        console.log('Target user after update:', {
            id: updatedUser.id,
            raw_password: updatedUser.raw_password,
        });
        
    } catch (e) {
        console.error('Error during update:', e);
    } finally {
        process.exit(0);
    }
}

testUpdate();
