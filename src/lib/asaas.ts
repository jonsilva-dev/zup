const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

export interface AsaasCustomerData {
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
    mobilePhone?: string;
}

export interface AsaasPaymentData {
    customer: string; // customer ID in Asaas (cus_xxxx)
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
    value: number;
    dueDate: string; // YYYY-MM-DD
    description?: string;
}

async function asaasFetch(endpoint: string, options: RequestInit = {}) {
    if (!ASAAS_API_KEY) {
        throw new Error('ASAAS_API_KEY não configurada no ambiente.');
    }

    const url = `${ASAAS_API_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
        ...(options.headers || {})
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        console.error(`Erro Asaas [${response.status}] ${endpoint}:`, data);
        throw new Error(data?.errors?.[0]?.description || `Erro na API do Asaas: ${response.statusText}`);
    }

    return data;
}

export async function createAsaasCustomer(data: AsaasCustomerData) {
    return asaasFetch('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function createAsaasPayment(data: AsaasPaymentData) {
    return asaasFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
            ...data,
            // Asaas usually requires a due date, so ensure it is passed correctly.
        }),
    });
}
