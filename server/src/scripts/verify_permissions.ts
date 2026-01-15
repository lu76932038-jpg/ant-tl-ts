import pool from '../config/database';
import { UserModel } from '../models/User';
import { register } from '../controllers/authController';
import { Request, Response } from 'express';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function verifyPermissions() {
    console.log('Starting verification...');

    const testUsername = `test_user_` + Date.now();
    const testEmail = `${testUsername}@example.com`;
    const testPassword = 'password123';

    try {
        console.log(`Creating test user: ${testUsername}`);

        // Mock request and response for register
        const req = {
            body: {
                username: testUsername,
                email: testEmail,
                password: testPassword
            }
        } as Request;

        let responseData: any = {};
        const res = {
            status: (code: number) => {
                console.log(`Response status: ${code}`);
                return {
                    json: (data: any) => {
                        responseData = data;
                        console.log('Response data:', data);
                    }
                };
            },
            json: (data: any) => {
                responseData = data;
                console.log('Response data:', data);
            }
        } as unknown as Response;

        // Call register controller
        await register(req, res);

        if (!responseData.user) {
            console.error('Registration failed or no user returned.');
            process.exit(1);
        }

        const user = responseData.user;
        console.log('Registered User Permissions:', user.permissions);

        const expectedPermissions = ['inquiry_parsing', 'profile', 'change_password'];
        const missing = expectedPermissions.filter(p => !user.permissions.includes(p));

        if (missing.length > 0) {
            console.error('Verification FAILED: Missing default permissions:', missing);
        } else {
            console.log('Verification PASSED: User has all default permissions.');
        }

        if (user.permissions.includes('at_orders')) {
            console.error('Verification FAILED: User should NOT have at_orders permission.');
        } else {
            console.log('Verification PASSED: User does NOT have restricted permissions.');
        }

        // Cleanup
        console.log('Cleaning up test user...');
        await UserModel.delete(user.id);

    } catch (error) {
        console.error('Verification failed with error:', error);
    } finally {
        process.exit(0);
    }
}

verifyPermissions();
