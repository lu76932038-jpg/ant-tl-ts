import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 根据截图定义的订单接口
export interface AntOrder extends RowDataPacket {
    订单日期: Date;
    订单号: string; // 主键
    产品型号: string | null;
    产品名: string | null;
    销售数量: number | null;
    销售单位: string | null;
    未税单价: number | null;
    未税小计: number | null;
    客户名: string | null;
    销售员: string | null;
    出库数量: number | null;
    合同交期: Date | null;
}

export class AntOrderModel {
    /**
     * 根据订单号查询详情
     */
    static async findByOrderNo(orderNo: string): Promise<AntOrder | null> {
        const [rows] = await pool.query<AntOrder[]>(
            'SELECT * FROM ant_order WHERE `订单号` = ?',
            [orderNo]
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * 获取销售员业绩汇总（常用于 AI 统计场景）
     */
    static async getSalesSummary(): Promise<any[]> {
        const [rows] = await pool.query(
            'SELECT `销售员`, SUM(`未税小计`) as totalAmount FROM ant_order GROUP BY `销售员` ORDER BY totalAmount DESC'
        );
        return rows as any[];
    }

    /**
     * 执行 AI 生成的原生 SQL 语句
     * 注意：此方法仅限只读操作，且需在 Service 层做好 SQL 注入校验
     */
    static async executeAiQuery(sql: string): Promise<any[]> {
        const [rows] = await pool.query(sql);
        return rows as any[];
    }
}