import axios from 'axios'
import supabase from './supabaseClient.js'

const api = axios.create({
    baseURL: 'http://localhost:3000'
})

api.interceptors.request.use(async function (config) {
    const { data } = await supabase.auth.getSession()
    const sessao = data.session

    if (sessao && sessao.access_token) {
        config.headers.Authorization = 'Bearer ' + sessao.access_token
    }

    return config
})

export default api
