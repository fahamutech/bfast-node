import {TransactionAdapter} from "../core/TransactionAdapter";
import {TransactionModel} from "../model/TransactionModel";
import {BFastConfig} from "../conf";
import {DeleteOperation} from "../model/DeleteOperation";
import {UpdateOperation} from "../model/UpdateOperation";

const axios = require('axios').default;

export class TransactionController implements TransactionAdapter {
    private prefix = '';
    private readonly transactionRequests: TransactionModel[];

    constructor(private readonly isNormalBatch = false) {
        this.transactionRequests = [];
        this.prefix = BFastConfig.devEnv ? '/_api' : '';
    }

    async commit(options?: { before: () => Promise<void>, after: () => Promise<void> }): Promise<any> {
        try {
            if (this.transactionRequests.length === 0) {
                throw new Error('You can not commit an empty transaction');
            }
            if (options && options.before) {
                await options.before();
            }
            const response = await axios.post(`${BFastConfig.getInstance().getCloudDatabaseUrl()}/batch`, {
                requests: this.transactionRequests,
                transaction: !this.isNormalBatch,
            }, {
                headers: BFastConfig.getInstance().getHeaders()
            });
            this.transactionRequests.splice(0);
            if (options && options.after) {
                await options.after();
            }
            return response.data;
        } catch (e) {
            throw e;
        }
    }

    create(domainName: string, data: Object): TransactionAdapter {
        this.transactionRequests.push({
            body: data,
            method: "POST",
            path: `${this.prefix}/classes/${domainName}`
        });
        return this;
    }

    createMany(domainName: string, data: Object[]): TransactionAdapter {
        const trans = data.map<TransactionModel>(payLoad => {
            return {
                body: payLoad,
                method: "POST",
                path: `${this.prefix}/classes/${domainName}`
            }
        });
        this.transactionRequests.push(...trans);
        return this;
    }

    delete(domainName: string, payLoad: { objectId: string, data?: DeleteOperation }): TransactionAdapter {
        this.transactionRequests.push({
            body: payLoad.data ? payLoad.data : {},
            method: "DELETE",
            path: `${this.prefix}/classes/${domainName}/${payLoad.objectId}`
        });
        return this;
    }

    deleteMany(domainName: string, payLoads: { objectId: string, data?: DeleteOperation }[]): TransactionAdapter {
        const trans = payLoads.map<TransactionModel>(payLoad => {
            return {
                body: payLoad.data ? payLoad.data : {},
                method: "DELETE",
                path: `${this.prefix}/classes/${domainName}/${payLoad.objectId}`
            }
        });
        this.transactionRequests.push(...trans);
        return this;
    }

    update(domainName: string, payLoad: { objectId: string, data: UpdateOperation }): TransactionAdapter {
        this.transactionRequests.push({
            body: payLoad.data,
            method: "PUT",
            path: `${this.prefix}/classes/${domainName}/${payLoad.objectId}`
        });
        return this;
    }

    updateMany(domainName: string, payLoads: { objectId: string, data: UpdateOperation }[]): TransactionAdapter {
        const trans = payLoads.map<TransactionModel>(payLoad => {
            return {
                body: payLoad.data,
                method: "PUT",
                path: `${this.prefix}/classes/${domainName}/${payLoad.objectId}`
            }
        });
        this.transactionRequests.push(...trans);
        return this;
    }

}