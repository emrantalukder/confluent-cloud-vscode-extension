/* eslint-disable @typescript-eslint/naming-convention */
import axios from 'axios';
import * as vscode from 'vscode';

let API_KEY = vscode.workspace.getConfiguration().get('confluentCloud.apiKey') as string;
let API_SECRET = vscode.workspace.getConfiguration().get('confluentCloud.apiSecret') as string;

const baseUrl = 'https://api.confluent.cloud';
let authHeader = `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')}`;

export const updateAuthHeader = () => {
    API_KEY = vscode.workspace.getConfiguration().get('confluentCloud.apiKey') as string;
    API_SECRET = vscode.workspace.getConfiguration().get('confluentCloud.apiSecret') as string;
    authHeader = `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')}`;
};

const listApi = async (url: string, data: any[]) => {

    data = data || [];

    var options = {
        method: 'GET',
        url: url,
        headers: { 'Authorization': authHeader }
    };

    await axios(options)
        .then((res) => {
            data = data.concat(res.data.data);
            if(res.data.metadata.next) {
                return listApi(res.data.metadata.next, data);
            }
        });

    return data;
};

const api = async (endpoint: string, method: string = 'GET', params: any = {}) => {

    updateAuthHeader();

    var options = {
        method: method,
        url: `${baseUrl}${endpoint}`,
        headers: { 'Authorization': authHeader },
        params: params
    };

    let res = await axios(options);

    let data = res.data.data;
    if(res.data.metadata.next) {
        let next = res.data.metadata.next;
        let listData = await listApi(next, data);
        res.data.data = listData;
    }

    return res;
};

export const getEnvironments = () => api('/org/v2/environments');

export const getClusters = (envId: string) => api(
    '/cmk/v2/clusters', 
    'GET',
    { environment:  envId }
);

export const getSchemaRegistryClusters = (envId: string) => api(
    '/srcm/v2/clusters',
    'GET',
    { environment:  envId }
);

