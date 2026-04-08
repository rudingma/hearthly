<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>

    <#if section = "header">
        Sign in to your household

    <#elseif section = "form">
        <div class="hearthly-form">
            <#if realm.password>
                <form id="kc-form-login" onsubmit="login.disabled = true; return true;"
                      action="${url.loginAction}" method="post">

                    <#-- Username/email field (hidden during re-auth) -->
                    <#if !usernameHidden??>
                        <div class="hearthly-field">
                            <input id="username" name="username" type="text"
                                   value="${(login.username!'')}"
                                   placeholder="<#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>"
                                   autocomplete="${(enableWebAuthnConditionalUI?has_content)?then('username webauthn', 'username')}"
                                   autofocus
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                   dir="ltr"
                                   class="hearthly-input<#if messagesPerField.existsError('username','password')> hearthly-input-error</#if>" />
                        </div>
                    </#if>

                    <#-- Password field -->
                    <div class="hearthly-field">
                        <input id="password" name="password" type="password"
                               placeholder="${msg("password")}"
                               autocomplete="current-password"
                               aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                               class="hearthly-input<#if messagesPerField.existsError('username','password')> hearthly-input-error</#if>" />
                    </div>

                    <#-- Field-level error (shown below inputs) -->
                    <#if messagesPerField.existsError('username','password')>
                        <div class="hearthly-field-error" aria-live="polite">
                            ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                        </div>
                    </#if>

                    <#-- Forgot password link -->
                    <#if realm.resetPasswordAllowed>
                        <div class="hearthly-forgot">
                            <a href="${url.loginResetCredentialsUrl}" class="hearthly-link-primary">
                                ${msg("doForgotPassword")}
                            </a>
                        </div>
                    </#if>

                    <#-- Required hidden field for credential selection -->
                    <input type="hidden" name="credentialId"
                           <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if> />

                    <#-- Submit button -->
                    <button type="submit" name="login" id="kc-login" class="hearthly-button">
                        ${msg("doLogIn")}
                    </button>
                </form>
            </#if>
        </div>

    <#elseif section = "info">
        <#-- Registration link (conditional on realm setting) -->
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div class="hearthly-register">
                ${msg("noAccount")} <a href="${url.registrationUrl}" class="hearthly-link-primary">${msg("doRegister")}</a>
            </div>
        </#if>

    <#elseif section = "socialProviders">
        <#-- Social login buttons (rendered when providers are configured) -->
        <#if realm.password && social?? && social.providers?has_content>
            <div class="hearthly-social">
                <div class="hearthly-divider"><span>${msg("identity-provider-login-label")}</span></div>
                <div class="hearthly-social-buttons">
                    <#list social.providers as p>
                        <a href="${p.loginUrl}" class="hearthly-social-button" id="social-${p.alias}" data-once-link>
                            <#if p.iconClasses?has_content><i class="${p.iconClasses!}" aria-hidden="true"></i></#if>
                            <span>${p.displayName!}</span>
                        </a>
                    </#list>
                </div>
            </div>
        </#if>
    </#if>

</@layout.registrationLayout>
