const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

// O dotenv expande $VAR como variável — guarde o token SEM o $ no .env.local.
// Ex: ASAAS_API_KEY=aact_hmlg_... (sem o $ inicial)
// O código reinsere o $ automaticamente ao enviar para a API.
const _rawKey = process.env.ASAAS_API_KEY;
const ASAAS_API_KEY = _rawKey
    ? (_rawKey.startsWith('$') ? _rawKey : `$${_rawKey}`)
    : undefined;


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

export async function findAsaasCustomerByCpfCnpj(cpfCnpj: string): Promise<string | null> {
    try {
        const data = await asaasFetch(`/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`);
        if (data?.data && data.data.length > 0) {
            return data.data[0].id as string;
        }
        return null;
    } catch {
        // Se a busca falhar, retorna null e tentamos criar o cliente
        return null;
    }
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
        body: JSON.stringify(data),
    });
}

export async function getAsaasPaymentById(chargeId: string) {
    return asaasFetch(`/payments/${chargeId}`);
}
