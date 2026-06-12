/* ============================================================
   VISA Careiro — Autenticação (Firebase Auth)
   Login, cadastro, logout, termos e troca de senha.
   ============================================================ */

// ─── Cadastro de novo usuário ───────────────────────────────
async function doRegister() {
    const email   = document.getElementById('regEmail')?.value.trim().toLowerCase();
    const senha   = document.getElementById('regSenha')?.value;
    const confirm = document.getElementById('regConfirmSenha')?.value;

    if (!email || !senha || senha !== confirm) {
        showToast('Preencha os dados corretamente.', 'error');
        return;
    }

    try {
        // Cria o usuário no Firebase Auth
        const userCred = await _fbAuth.createUserWithEmailAndPassword(email, senha);
        const uid = userCred.user.uid;

        // Salva dados complementares no Firestore (role, perfil)
        await _USERS_REF.doc(uid).set({
            email: email,
            role: 'fiscal',               // papel padrão
            profile: { nome: '' }
        });

        showToast('Conta criada com sucesso! Faça login.', 'success');
        closeModal('modalRegister');      // fecha o modal de cadastro
        document.getElementById('loginOverlay').style.display = 'flex';
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── Login com Firebase Auth ────────────────────────────────
async function doLogin() {
    const email   = document.getElementById('loginEmail').value.trim().toLowerCase();
    const senha   = document.getElementById('loginSenha').value;
    const errEl   = document.getElementById('loginErr');
    const btn     = document.getElementById('loginBtn');

    errEl.style.display = 'none';
    if (!email || !senha) {
        errEl.textContent = 'Preencha e‑mail e senha.';
        errEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Verificando…';

    try {
        const userCred = await _fbAuth.signInWithEmailAndPassword(email, senha);
        const user = userCred.user;

        // Busca dados extras (role, profile) no Firestore
        const snap = await _USERS_REF.doc(user.uid).get();
        if (!snap.exists) {
            // Usuário existe no Auth mas não tem registro Firestore – cria um básico
            await _USERS_REF.doc(user.uid).set({
                email: user.email,
                role: 'fiscal',
                profile: { nome: user.email }
            });
            _currentUser = { uid: user.uid, email: user.email, role: 'fiscal', profile: { nome: user.email } };
        } else {
            _currentUser = { uid: user.uid, email: user.email, ...snap.data() };
        }

        // Persiste a sessão
        try { sessionStorage.setItem('visa_session', JSON.stringify(_currentUser)); } catch (e) {}

        btn.textContent = 'Entrando…';
        await boot();

    } catch (err) {
        console.error('Login error:', err);
        let msg = 'E‑mail ou senha inválidos.';
        if (err.code === 'auth/user-not-found') msg = 'Usuário não encontrado.';
        else if (err.code === 'auth/wrong-password') msg = 'Senha incorreta.';
        else if (err.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Tente novamente mais tarde.';
        errEl.textContent = msg;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Entrar';
    }
}

// ─── Logout ─────────────────────────────────────────────────
async function doLogout() {
    if (!confirm('Deseja sair do sistema?')) return;

    await _fbAuth.signOut();
    _currentUser = null;
    try { sessionStorage.removeItem('visa_session'); } catch (e) {}

    // Reseta UI
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginSenha').value = '';
    document.getElementById('loginErr').style.display = 'none';
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('loginBtn').disabled = false;
    document.getElementById('loginBtn').textContent = 'Entrar';
    document.getElementById('loadingOverlay').style.display = 'none';
}

// ─── Termos de Uso (mantido) ────────────────────────────────
function verificarTermos() {
    const aceitos = localStorage.getItem('visa_terms_accepted');
    if (_currentUser && !aceitos) {
        openModal('modalTermos');
        return false;
    }
    return true;
}

function aceitarTermos() {
    try { localStorage.setItem('visa_terms_accepted', '1'); } catch (e) {}
    closeModal('modalTermos');
    document.getElementById('loadingOverlay').style.display = 'flex';
    carregarDadosRemotos();
}

function rejeitarTermos() {
    try { localStorage.removeItem('visa_terms_accepted'); } catch (e) {}
    closeModal('modalTermos');
    doLogout();
}

// ─── Troca de senha (usando Firebase Auth) ──────────────────
async function changeAdminPassword() {
    const newPass = (document.getElementById('newPasswordAdmin')?.value || '').trim();
    const confirm = (document.getElementById('confirmPasswordAdmin')?.value || '').trim();

    if (!newPass || newPass.length < 6) {
        showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
        return;
    }
    if (newPass !== confirm) {
        showToast('As senhas não coincidem.', 'error');
        return;
    }

    try {
        const user = _fbAuth.currentUser;
        if (!user) throw new Error('Nenhum usuário autenticado.');
        await user.updatePassword(newPass);
        // Opcional: remove o campo 'senha' do Firestore, pois agora usamos Auth
        // await _USERS_REF.doc(user.uid).update({ senha: firebase.firestore.FieldValue.delete() });
        document.getElementById('newPasswordAdmin').value = '';
        document.getElementById('confirmPasswordAdmin').value = '';
        showToast('Senha alterada com sucesso! ✅', 'success');
    } catch (err) {
        console.error('Erro ao alterar senha:', err);
        let msg = 'Erro ao alterar senha.';
        if (err.code === 'auth/requires-recent-login') {
            msg = 'Por segurança, faça login novamente antes de alterar a senha.';
        }
        showToast(msg, 'error');
    }
}

// ─── Verificação de senha (reautenticação para ações sensíveis) ─
let _pendingPasswordCallback = null;

async function verifyAdminPassword(password) {
    const user = _fbAuth.currentUser;
    if (!user) return false;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
    try {
        await user.reauthenticateWithCredential(credential);
        return true;
    } catch (e) {
        return false;
    }
}

function promptAdminPassword(successCallback, cancelCallback) {
    _pendingPasswordCallback = { success: successCallback, cancel: cancelCallback || (() => {}) };
    const input = document.getElementById('promptPasswordInput');
    const errorEl = document.getElementById('promptPasswordError');
    if (input) input.value = '';
    if (errorEl) errorEl.style.display = 'none';
    openModal('modalPasswordPrompt');
    setTimeout(() => document.getElementById('promptPasswordInput')?.focus(), 100);
}

async function confirmPasswordAction() {
    const password = document.getElementById('promptPasswordInput')?.value || '';
    if (!password) {
        const errorEl = document.getElementById('promptPasswordError');
        if (errorEl) { errorEl.textContent = 'Digite a senha.'; errorEl.style.display = 'block'; }
        return;
    }
    const isValid = await verifyAdminPassword(password);
    if (isValid) {
        closeModal('modalPasswordPrompt');
        const cb = _pendingPasswordCallback?.success;
        _pendingPasswordCallback = null;
        if (cb) cb();
    } else {
        const errorEl = document.getElementById('promptPasswordError');
        if (errorEl) { errorEl.textContent = 'Senha incorreta.'; errorEl.style.display = 'block'; }
    }
}

function cancelPasswordAction() {
    closeModal('modalPasswordPrompt');
    const cb = _pendingPasswordCallback?.cancel;
    _pendingPasswordCallback = null;
    if (cb) cb();
}
