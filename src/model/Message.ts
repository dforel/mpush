/**
 * Message
 * create 2019/7/31
 * 中央处理的唯一对象
 * 接收的所有外部消息都会转换成该对象
 * 一个对象仅包含一条信息
 */

import EventEmitter from 'events'
import Client from './Client';
import config from "../_config";
import { WebSocketMessage, MessageType } from "../../typings";

export default class Message extends EventEmitter {
    public sendType: 'personal' | 'group'
    public target: string
    public from: MessageType.from
    public text: string
    public desp: string
    public extra: {
        [name: string]: any
    }
    public readonly mid: string
    private readonly status: {
        [name: string]: 'ready' | 'ok' | 'no' | 'wait' | 'timeout'
    }
    // 记录是否所有客户端的状态都更新了

    constructor(sendType: 'personal' | 'group' = 'personal', target: string = '', from: MessageType.from = { method: '', name: '' }, text: string = '', desp: string = '', extra: { [name: string]: any } = {}) {
        super()
        this.sendType = sendType
        this.target = target
        this.from = from
        this.text = text
        this.desp = desp
        this.extra = extra
        this.mid = String((new Date()).valueOf())
        this.status = {}
    }

    public verify(): boolean {
        return !!this.text || !!this.desp
    }

    /**
     * 将目标客户端添加到消息体中
     * 并初始化推送状态为'wait'
     * @param client 
     */
    public addClient(client: Client): void {
        this.status[client.name] = 'ready'
    }

    /**
     * 设置推送失败的客户端
     * 只会用于一对一推送时
     * @param name 
     */
    public setFailedClient(name: string): void {
        this.status[name] = 'no'
    }

    /**
     * 改变该消息推送目标的接收状态
     * @param client 
     * @param status 
     */
    public setClientStatus(client: Client, status: 'ok' | 'no' | 'wait' | 'timeout') {
        this.status[client.name] = status

        let allOk = true
        for (let name of Object.keys(this.status)) {
            if (this.status[name] !== 'ok') {
                allOk = false
                break
            }
        }
        if (allOk) {
            this.emit('PushComplete', this.status)
        }
    }

    /**
     * 获取所有目标客户端的推送状态
     * 不管是否所有状态都更新了
     */
    public getStatus(): { [name: string]: 'ready' | 'ok' | 'no' | 'wait' | 'timeout' } {
        return this.status
    }

    /**
     * 返回用于webhook GET方法的数据
     */
    public toCurlGetParams(): object {
        const result = {}
        // 将extra平铺到返回的对象中
        // 后面的优先级更高 相同字段会被后面覆盖
        Object.assign(result, this.extra, {
            token: config.TOKEN,
            sendType: this.sendType,
            target: this.target,
            fromMethod: this.from.method,
            fromName: this.from.name,
            mid: this.mid,
            text: this.text,
            desp: this.desp,
        })
        return result
    }

    /**
     * 返回用于webhook Post方法的数据
     */
    public toCurlPostData(): object {
        return {
            token: config.TOKEN,
            sendType: this.sendType,
            target: this.target,
            from: this.from,
            mid: this.mid,
            message: {
                text: this.text,
                desp: this.desp,
                extra: this.extra
            }
        }
    }

    /**
     * 返回用于ws方式发送的数据
     */
    public toWebSocketData(): WebSocketMessage.MessageData {
        return {
            sendType: this.sendType,
            target: this.target,
            from: this.from,
            mid: this.mid,
            message: {
                text: this.text,
                desp: this.desp,
                extra: this.extra
            }
        }
    }


}