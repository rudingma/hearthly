<#import "footer.ftl" as loginFooter>
<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" type="image/svg+xml" href="${url.resourcesPath}/img/favicon.svg">
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#-- Required: rfc4648 importmap for WebAuthn/passkeys support -->
    <script type="importmap">
        { "imports": { "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js" } }
    </script>
    <#-- Required: locale dropdown menu (forward compat for i18n) -->
    <script src="${url.resourcesPath}/js/menu-button-links.js" type="module"></script>
    <#-- Required: SSO session polling (detects login in other tabs) -->
    <script type="module">
        import { startSessionPolling } from "${url.resourcesPath}/js/authChecker.js";
        startSessionPolling("${url.ssoLoginInOtherTabsUrl?no_esc}");
    </script>
    <#-- Required: auth session checker (detects expired sessions) -->
    <#if authenticationSession??>
        <script type="module">
            import { checkAuthSession } from "${url.resourcesPath}/js/authChecker.js";
            checkAuthSession("${authenticationSession.authSessionIdHash}");
        </script>
    </#if>
    <#-- Prevent double-click on links (social login buttons) -->
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");
            if (!link) return;
            if (link.getAttribute("aria-disabled") === "true") { event.preventDefault(); return; }
            link.setAttribute("role", "link");
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#-- Additional scripts injected by Keycloak extensions -->
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
</head>
<body>
    <div class="hearthly-login">
        <#-- Logo: Home Glow SVG, identical to welcome screen -->
        <div class="hearthly-logo">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 48L50 14L86 48V88H14V48Z" stroke="var(--hearthly-primary)" stroke-width="5.5" stroke-linejoin="round" fill="none"/>
                <path d="M8 50L50 10L92 50" stroke="var(--hearthly-primary)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <rect x="37" y="54" width="26" height="34" rx="13" fill="var(--hearthly-primary-tint)" opacity="0.6"/>
                <rect x="42" y="58" width="16" height="30" rx="8" fill="var(--hearthly-primary)" opacity="0.3"/>
            </svg>
        </div>

        <#-- Title + subtitle, or re-auth flow -->
        <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
            <h1 class="hearthly-title">${realm.displayName!''}</h1>
            <p class="hearthly-subtitle"><#nested "header"></p>
        <#else>
            <h1 class="hearthly-title">${realm.displayName!''}</h1>
            <div class="hearthly-reauth">
                <span class="hearthly-reauth-user">${auth.attemptedUsername}</span>
                <a href="${url.loginRestartFlowUrl}" class="hearthly-reauth-link">${msg("restartLoginTooltip")}</a>
            </div>
        </#if>

        <#-- Global alert messages (account locked, password reset success, etc.) -->
        <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
            <div class="hearthly-alert hearthly-alert-${message.type}" role="alert">
                ${kcSanitize(message.summary)?no_esc}
            </div>
        </#if>

        <#-- Main form content (provided by login.ftl) -->
        <#nested "form">

        <#-- Try another way (multi-factor flows) -->
        <#if auth?has_content && auth.showTryAnotherWayLink()>
            <div class="hearthly-try-another">
                <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post">
                    <input type="hidden" name="tryAnotherWay" value="on"/>
                    <a href="#" onclick="document.forms['kc-select-try-another-way-form'].requestSubmit();return false;">
                        ${msg("doTryAnotherWay")}
                    </a>
                </form>
            </div>
        </#if>

        <#-- Social providers (provided by login.ftl) -->
        <#nested "socialProviders">

        <#-- Info section (registration link, etc.) -->
        <#if displayInfo>
            <div class="hearthly-info"><#nested "info"></div>
        </#if>

        <@loginFooter.content/>
    </div>
</body>
</html>
</#macro>
