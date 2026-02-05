import nodemailer from 'nodemailer';
import { config } from '../config/env';

// In-memory store for verification codes: email -> { code, expiresAt }
const verificationCodes: Record<string, { code: string; expiresAt: number }> = {};

// Create reusable transporter object using the default SMTP transport
console.log('EMAIL_SERVICE: Creating transporter with:', {
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    user: config.email.user
});

const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // true for 465, false for other ports
    pool: true, // Use pooled connections
    maxConnections: 5,
    maxMessages: 100,
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
});

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server is ready to take our messages');
    }
});

export const sendVerificationEmail = async (email: string): Promise<string> => {
    console.log(`EMAIL_SERVICE: Attempting to send code to ${email}`);
    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration to 5 minutes
    const expiresAt = Date.now() + 5 * 60 * 1000;

    verificationCodes[email.toLowerCase().trim()] = { code, expiresAt };

    if (!config.email.host || !config.email.user) {
        console.warn('SMTP configuration missing. Printing code to console instead.');
        console.log(`[EMAIL MOCK] Verification code for ${email}: ${code}`);
        return code;
    }

    try {
        await transporter.sendMail({
            from: `"Ant Tools Security" <${config.email.user}>`, // sender address
            to: email, // list of receivers
            subject: "您的验证码 - 殸木系统", // Subject line
            text: `您的验证码是: ${code}。有效时间5分钟，请勿告诉他人。`, // plain text body
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2c2c2c;">验证码</h2>
                    <p>您正在进行身份验证，您的验证码是：</p>
                    <h1 style="color: #007bff; letter-spacing: 5px;">${code}</h1>
                    <p>有效时间 5 分钟，请勿泄露给他人。</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888;">如果这不是您本人的操作，请忽略此邮件。</p>
                </div>
            `, // html body
        });
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error('Error sending email:', error);
        // Fallback to console log for dev if email fails
        console.log(`[EMAIL FALLBACK] Verification code for ${email}: ${code}`);
        throw new Error('发送验证邮件失败，请检查邮箱地址或稍后重试');
    }

    return code;
};

export const verifyEmailCode = (email: string, code: string): boolean => {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();
    const record = verificationCodes[normalizedEmail];

    console.log(`Debug: Verifying code for ${normalizedEmail}. Input: ${normalizedCode}. Record: ${record ? record.code : 'null'}`);

    if (!record) {
        console.log('Debug: No record found for email.');
        return false;
    }

    if (Date.now() > record.expiresAt) {
        console.log('Debug: Code expired.');
        delete verificationCodes[normalizedEmail];
        return false;
    }

    if (record.code === normalizedCode) {
        delete verificationCodes[normalizedEmail]; // Consume code on successful verify
        return true;
    }

    return false;
};

export const sendPurchaseOrderNotification = async (recipients: string[], poData: any): Promise<void> => {
    if (!recipients || recipients.length === 0) return;

    // 变量初始化
    let estimatedAmountStr = '待核算';
    let supplierName = '未指定供应商';
    let unitPriceStr = '待核算';
    let leadTimeStr = '未知';
    const sourceStr = poData.source === 'AUTO' ? '系统自动生成' : (poData.source === 'MANUAL' ? '人工手动创建' : '未知来源');

    try {
        const supplier = typeof poData.supplier_info === 'string' ? JSON.parse(poData.supplier_info) : poData.supplier_info;

        if (supplier) {
            supplierName = supplier.name || '未指定供应商';

            // 尝试获取选中的阶梯价格，或者默认第一档
            // 注意：SchedulerService 已经做了兜底并把 leadTime 提升到了顶层，这里再次检查确保稳健
            const selectedTier = supplier.priceTiers?.find((t: any) => t.isSelected) || (supplier.priceTiers && supplier.priceTiers.length > 0 ? supplier.priceTiers[0] : null);

            // 优先使用顶层属性 (SchedulerService 已处理)，兜底使用 Tier
            const price = supplier.price || (selectedTier ? selectedTier.price : 0);
            const leadTime = supplier.leadTime || (selectedTier ? (selectedTier.leadTime || selectedTier.leadTimeDays) : 0);

            if (price) {
                unitPriceStr = `¥${Number(price).toLocaleString()}`;
                estimatedAmountStr = `¥${(poData.quantity * price).toLocaleString()}`;
            }

            if (leadTime) {
                leadTimeStr = `${leadTime} 天`;
            }
        }
    } catch (e) {
        console.warn('Failed to calculate details for email', e);
    }

    const mailOptions = {
        from: `"Ant Tools Notification" <${config.email.user}>`,
        to: recipients.join(', '),
        subject: `[采购计划通知] ${poData.product_name} (${poData.sku}) - 待处理`,
        text: `一份新的采购计划已生成。\n产品: ${poData.product_name}\nSKU: ${poData.sku}\n数量: ${poData.quantity}\n预估金额: ${estimatedAmountStr}\n状态说明: 待转化`,
        html: `
            <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #1a1a1b; padding: 40px 20px; color: #ffffff;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #262627; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid #333334;">
                    <!-- Header Banner -->
                    <div style="background: linear-gradient(135deg, #0061ff 0%, #60efff 100%); padding: 30px; text-align: left;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">采购计划通知</h1>
                        <p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.8); font-weight: 500;">采购计划 ID: PLAN-${Date.now().toString().slice(-6)}</p>
                    </div>

                    <!-- Content Body -->
                    <div style="padding: 30px;">
                        <p style="font-size: 15px; line-height: 1.6; color: #d1d1d1; margin-bottom: 25px;">
                            系统已自动根据您的库存策略生成一份<b>采购计划</b>。
                        </p>

                        <div style="background-color: #1e1e1f; border-radius: 10px; padding: 20px; border: 1px solid #333334;">
                            <table style="width: 100%; border-collapse: collapse;">
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase;">产品名称</td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #ffffff; font-size: 14px; font-weight: 700; text-align: right;">${poData.product_name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase;">SKU</td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #3b82f6; font-size: 14px; font-weight: 800; text-align: right; font-family: monospace;">${poData.sku}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase;">供应商</td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right;">${supplierName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase;">计划采购数量</td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #10b981; font-size: 18px; font-weight: 900; text-align: right;">${poData.quantity.toLocaleString()} <span style="font-size: 12px; color: #666;">PCS</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase;">采购单价</td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right;">${unitPriceStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase;">预估采购金额</td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #f59e0b; font-size: 14px; font-weight: 800; text-align: right;">${estimatedAmountStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase;">预计货期</td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #ffffff; font-size: 14px; font-weight: 500; text-align: right;">${leadTimeStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase;">来源</td>
                                    <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2e; color: #ffffff; font-size: 13px; font-weight: 500; text-align: right;">${sourceStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; color: #888; font-size: 13px; font-weight: 600; text-transform: uppercase;">生成日期</td>
                                    <td style="padding: 12px 0; color: #ffffff; font-size: 13px; font-weight: 500; text-align: right;">${poData.order_date}</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Badge -->
                        <div style="margin-top: 20px; display: inline-block; background-color: rgba(100, 116, 139, 0.1); border: 1px solid rgba(100, 116, 139, 0.2); padding: 6px 12px; border-radius: 6px;">
                           <span style="color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase;">等待转化为正式订单</span>
                        </div>

                        <div style="margin-top: 40px; text-align: center;">
                            <a href="http://172.16.50.100:3000/stock/purchase-plans" style="display: inline-block; background: #0061ff; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 800; box-shadow: 0 4px 14px rgba(0, 97, 255, 0.4); transition: all 0.2s ease;">前往处理计划</a>
                        </div>
                    </div>

                    <div style="background-color: #212122; padding: 25px; text-align: center; border-top: 1px solid #333334;">
                        <p style="margin: 0; font-size: 12px; color: #666; font-weight: 500;">
                            此邮件由 Ant Tools 自动化引擎生成的备货系统通知<br/>
                            © 2026 Ant Tools Supply Chain. 请勿直接回复此邮件。
                        </p>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`PO Notification sent to ${recipients.length} recipients`);
    } catch (error) {
        console.error('Error sending PO notification:', error);
        // Don't throw, just log. Notification failure shouldn't block PO creation.
    }
};

export const sendQuestionNotification = async (question: any, authorName: string): Promise<void> => {
    // Admin email from config or hardcoded for MVP
    const adminEmail = 'admin@example.com';

    // Try to use the config user as admin email if it looks like an email
    const recipient = config.email.user.includes('@') ? config.email.user : adminEmail;

    try {
        // Robustness: ensure tags is an array
        let tags: string[] = [];
        if (Array.isArray(question.tags)) {
            tags = question.tags;
        } else if (typeof question.tags === 'string') {
            try {
                tags = JSON.parse(question.tags);
            } catch (e) {
                tags = [question.tags];
            }
        }

        const content = question.content || '';
        const title = question.title || '无标题';

        const mailOptions = {
            from: `"Ant Community" <${config.email.user}>`,
            to: recipient,
            subject: `[新提问] ${title}`,
            text: `社区有新提问：\n标题：${title}\n作者：${authorName}\n标签：${tags.join(', ')}\n\n摘要：${content.substring(0, 100)}...`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; padding: 20px; color: #333; background-color: #f9fafb;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <h2 style="color: #7c3aed; margin-top: 0;">社区新提问通知</h2>
                        <p style="color: #6b7280; font-size: 14px;">有用户发布了新的技术提问，请关注。</p>
                        
                        <div style="margin: 20px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
                            <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #111827;">${title}</h3>
                            <div style="margin-bottom: 10px;">
                                ${tags.map((tag: string) => `<span style="background:#7c3aed; color:white; padding:2px 8px; border-radius:12px; font-size:12px; margin-right:5px;">${tag}</span>`).join('')}
                            </div>
                            <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
                                ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}
                            </p>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                            <span>作者: <strong>${authorName}</strong></span>
                            <span>时间: ${new Date().toLocaleString()}</span>
                        </div>
                        
                        <div style="margin-top: 20px; text-align: center;">
                            <a href="http://localhost:3000/community" style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">前往社区查看</a>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Question notification email sent to ${recipient}`);
    } catch (error) {
        console.error('Error sending question notification:', error);
    }
};
