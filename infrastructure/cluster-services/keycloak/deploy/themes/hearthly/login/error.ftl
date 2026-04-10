<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false displayInfo=false; section>

    <#if section = "header">
        Please use the Hearthly app to sign in

    <#elseif section = "form">
        <div class="hearthly-form" style="text-align: center;">
            <p style="color: var(--hearthly-text-muted); font-size: 15px; margin-bottom: 24px;">
                Direct login is not available. Open the Hearthly app to continue.
            </p>
        </div>
    </#if>

</@layout.registrationLayout>
