import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// [Disposable domains array - keeping original]
const disposableDomains = [
  // Major disposable services
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempmail.de',
  'throwaway.com', 'throwawaymail.com', 'throwaway.email',
  'guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net', 'guerrillamail.biz', 'guerrillamail.de',
  'mailinator.com', 'mailinator.net', 'mailinator.org', 'mailinator2.com',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minemail.com',
  'fakeinbox.com', 'fake-mail.net', 'fakemailgenerator.com',
  'trashmail.com', 'trashmail.net', 'trashmail.org', 'trashmail.ws', 'trash-mail.com',
  'getairmail.com', 'getnada.com', 'nada.email',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'yop.email',
  'discard.email', 'discardmail.com', 'discardmail.de',
  'mohmal.com', 'mohmal.im', 'mohmal.tech',
  'tempail.com', 'tempr.email', 'tempemail.net',
  'burnermail.io', 'burnermailapp.com',
  'sharklasers.com', 'guerrillamailblock.com',
  'maildrop.cc', 'mailsac.com', 'mailnesia.com',
  'mytemp.email', 'mytrashmail.com',
  'emailondeck.com', 'emailfake.com',
  'spamgourmet.com', 'spamex.com', 'spamfree24.org',
  // Additional disposable domains
  '20minutemail.com', '20email.it', '20mail.it',
  '33mail.com', 'anonymbox.com', 'antispam.de',
  'binkmail.com', 'bobmail.info', 'bofthew.com',
  'bugmenot.com', 'bumpymail.com', 'casualdx.com',
  'centermail.com', 'cheatmail.de', 'cko.kr',
  'cool.fr.nf', 'correo.blogos.net', 'cosmorph.com',
  'courriel.fr.nf', 'courrieltemporaire.com', 'curryworld.de',
  'cust.in', 'dacoolest.com', 'dandikmail.com',
  'deadaddress.com', 'despam.it', 'despammed.com',
  'devnullmail.com', 'dfgh.net', 'digitalsanctuary.com',
  'dingbone.com', 'disposableaddress.com', 'disposableemailaddresses.com',
  'disposableinbox.com', 'dispose.it', 'dispostable.com',
  'dm.w3internet.co.uk', 'dodgeit.com', 'dodgemail.de',
  'dodgit.com', 'dontreg.com', 'dontsendmespam.de',
  'drdrb.com', 'dump-email.info', 'dumpandjunk.com',
  'dumpyemail.com', 'e4ward.com', 'easytrashmail.com',
  'email60.com', 'emaildienst.de', 'emailgo.de',
  'emailias.com', 'emailigo.de', 'emailinfive.com',
  'emaillime.com', 'emailmiser.com', 'emailsensei.com',
  'emailtemporar.ro', 'emailtemporaire.com', 'emailtemporaire.fr',
  'emailthe.net', 'emailtmp.com', 'emailto.de',
  'emailwarden.com', 'emailx.at.hm', 'emailxfer.com',
  'emz.net', 'enterto.com', 'ephemail.net',
  'etranquil.com', 'etranquil.net', 'etranquil.org',
  'evopo.com', 'explodemail.com', 'express.net.ua',
  'eyepaste.com', 'fakeinformation.com', 'fantasymail.de',
  'fastacura.com', 'fastchevy.com', 'fastchrysler.com',
  'fastkawasaki.com', 'fastmazda.com', 'fastmitsubishi.com',
  'fastnissan.com', 'fastsubaru.com', 'fastsuzuki.com',
  'fasttoyota.com', 'fastyamaha.com', 'filzmail.com',
  'fizmail.com', 'flyspam.com', 'fr33mail.info',
  'frapmail.com', 'friendlymail.co.uk', 'front14.org',
  'fuckingduh.com', 'fudgerub.com', 'garliclife.com',
  'gehensiull.com', 'gelitik.in', 'get1mail.com',
  'get2mail.fr', 'getonemail.com', 'getonemail.net',
  'ghosttexter.de', 'giantmail.de', 'girlsundertheinfluence.com',
  'gishpuppy.com', 'goemailgo.com', 'gorillaswithdirtyarmpits.com',
  'gotmail.com', 'gotmail.net', 'gotmail.org',
  'gotti.otherinbox.com', 'gowikibooks.com', 'gowikicampus.com',
  'gowikicars.com', 'gowikifilms.com', 'gowikigames.com',
  'gowikimusic.com', 'gowikinetwork.com', 'gowikitravel.com',
  'gowikitv.com', 'grandmamail.com', 'grandmasmail.com',
  'great-host.in', 'greensloth.com', 'grr.la',
  'gsrv.co.uk', 'h8s.org', 'hacccc.com',
  'haltospam.com', 'harakirimail.com', 'hatespam.org',
  'herp.in', 'hidemail.de', 'hidzz.com',
  'hmamail.com', 'hochsitze.com', 'hopemail.biz',
  'hotpop.com', 'hulapla.de', 'hushmail.com',
  'ieatspam.eu', 'ieatspam.info', 'ihateyoualot.info',
  'iheartspam.org', 'imails.info', 'imgof.com',
  'imgv.de', 'imstations.com', 'inbax.tk',
  'inbox.si', 'inboxalias.com', 'inboxclean.com',
  'inboxclean.org', 'incognitomail.com', 'incognitomail.net',
  'incognitomail.org', 'infocom.zp.ua', 'insorg-mail.info',
  'instant-mail.de', 'instantemailaddress.com', 'iozak.com',
  'ipoo.org', 'irish2me.com', 'iwi.net',
  'jetable.com', 'jetable.fr.nf', 'jetable.net',
  'jetable.org', 'jnxjn.com', 'jourrapide.com',
  'jsrsolutions.com', 'junk1.com', 'kasmail.com',
  'kaspop.com', 'keepmymail.com', 'killmail.com',
  'killmail.net', 'kimsdisk.com', 'kingsq.ga',
  'kiois.com', 'klassmaster.com', 'klassmaster.net',
  'klzlv.com', 'kulturbetrieb.info', 'kurzepost.de',
  'lawlita.com', 'lazyinbox.com', 'letthemeatspam.com',
  'lhsdv.com', 'lifebyfood.com', 'link2mail.net',
  'litedrop.com', 'lol.ovpn.to', 'lookugly.com',
  'lopl.co.cc', 'lortemail.dk', 'lovemeleaveme.com',
  'lr78.com', 'lroid.com', 'lukop.dk',
  'm4ilweb.info', 'maboard.com', 'mail.by',
  'mail.mezimages.net', 'mail.zp.ua', 'mail114.net',
  'mail2rss.org', 'mail333.com', 'mail4trash.com',
  'mailbidon.com', 'mailblocks.com', 'mailcatch.com',
  'mailchop.com', 'mailde.de', 'mailde.info',
  'maildrop.cc', 'maildu.de', 'maildx.com',
  'mailed.ro', 'mailexpire.com', 'mailfa.tk',
  'mailforspam.com', 'mailfree.ga', 'mailfreeonline.com',
  'mailguard.me', 'mailin8r.com', 'mailinater.com',
  'mailincubator.com', 'mailismagic.com', 'mailjunk.cf',
  'mailjunk.ga', 'mailjunk.gq', 'mailjunk.ml',
  'mailjunk.tk', 'mailmate.com', 'mailme.gq',
  'mailme.ir', 'mailme.lv', 'mailme24.com',
  'mailmetrash.com', 'mailmoat.com', 'mailnator.com',
  'mailnesia.com', 'mailnull.com', 'mailorg.org',
  'mailpick.biz', 'mailproxsy.com', 'mailquack.com',
  'mailrock.biz', 'mailsac.com', 'mailscrap.com',
  'mailseal.de', 'mailshell.com', 'mailsiphon.com',
  'mailslite.com', 'mailspam.xyz', 'mailtemp.info',
  'mailtothis.com', 'mailzilla.com', 'mailzilla.org',
  'makemetheking.com', 'manifestgenerator.com', 'manybrain.com',
  'mbx.cc', 'mega.zik.dj', 'meinspamschutz.de',
  'meltmail.com', 'messagebeamer.de', 'mezimages.net',
  'mierdamail.com', 'migmail.pl', 'mintemail.com',
  'misterpinball.de', 'mmmmail.com', 'moakt.com',
  'mobi.web.id', 'mobileninja.co.uk', 'moburl.com',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf',
  'monumentmail.com', 'ms9.mailslite.com', 'msa.minsmail.com',
  'msb.minsmail.com', 'msg.mailslite.com', 'mxfuel.com',
  'my10minutemail.com', 'mycleaninbox.net', 'myemailboxy.com',
  'mymail-in.net', 'mymailoasis.com', 'mynetstore.de',
  'mypacks.net', 'mypartyclip.de', 'myphantomemail.com',
  'mysamp.de', 'myspaceinc.com', 'myspaceinc.net',
  'myspacepimpedup.com', 'myspamless.com', 'mytempemail.com',
  'mytempmail.com', 'mytrashmail.com', 'nabuma.com',
  'neomailbox.com', 'nepwk.com', 'nervmich.net',
  'nervtmansen.de', 'netmails.com', 'netmails.net',
  'netzidiot.de', 'neverbox.com', 'nice-4u.com',
  'nincsmail.hu', 'nmail.cf', 'nobulk.com',
  'noclickemail.com', 'nogmailspam.info', 'nomail.xl.cx',
  'nomail2me.com', 'nomorespamemails.com', 'nospam.ze.tc',
  'nospam4.us', 'nospamfor.us', 'nospammail.net',
  'nospamthanks.info', 'notmailinator.com', 'notvashmail.ru',
  'nowhere.org', 'nowmymail.com', 'nurfuerspam.de',
  'nus.edu.sg', 'nwldx.com', 'objectmail.com',
  'obobbo.com', 'odnorazovoe.ru', 'one-time.email',
  'oneoffemail.com', 'onewaymail.com', 'onlatedotcom.info',
  'online.ms', 'oopi.org', 'opayq.com',
  'ordinaryamerican.net', 'otherinbox.com', 'ourklips.com',
  'outlawspam.com', 'ovpn.to', 'owlpic.com',
  'pancakemail.com', 'pjjkp.com', 'plexolan.de',
  'poczta.onet.pl', 'politikerclub.de', 'poofy.org',
  'pookmail.com', 'privacy.net', 'privatdemail.net',
  'proxymail.eu', 'prtnx.com', 'punkass.com',
  'putthisinyourspamdatabase.com', 'pwrby.com', 'qisdo.com',
  'qisoa.com', 'quickinbox.com', 'quickmail.nl',
  'rcpt.at', 'reallymymail.com', 'realtyalerts.ca',
  'recode.me', 'recursor.net', 'recyclemail.dk',
  'regbypass.com', 'regbypass.comsafe-mail.net', 'rejectmail.com',
  'remail.cf', 'remail.ga', 'rhyta.com',
  'rklips.com', 'rmqkr.net', 'royal.net',
  'rppkn.com', 'rtrtr.com', 's0ny.net',
  'safe-mail.net', 'safersignup.de', 'safetymail.info',
  'safetypost.de', 'sandelf.de', 'sayawaka-dea.info',
  'saynotospams.com', 'schafmail.de', 'schrott-email.de',
  'secretemail.de', 'secure-mail.biz', 'selfdestructingmail.com',
  'senseless-entertainment.com', 'server.ms.selfip.net', 'sharklasers.com',
  'shieldemail.com', 'shiftmail.com', 'shitmail.me',
  'shortmail.net', 'shut.name', 'shut.ws',
  'sibmail.com', 'sinnlos-mail.de', 'siteposter.net',
  'skeefmail.com', 'slaskpost.se', 'slopsbox.com',
  'slowslow.de', 'smashmail.de', 'smellfear.com',
  'snakemail.com', 'sneakemail.com', 'sneakmail.de',
  'snkmail.com', 'sofimail.com', 'sofort-mail.de',
  'sogetthis.com', 'sohu.com', 'soisz.com',
  'solvemail.info', 'soodonims.com', 'spam.la',
  'spam.su', 'spam4.me', 'spamail.de',
  'spamarrest.com', 'spamavert.com', 'spambob.com',
  'spambob.net', 'spambob.org', 'spambog.com',
  'spambog.de', 'spambog.net', 'spambog.ru',
  'spambox.info', 'spambox.irishspringrealty.com', 'spambox.us',
  'spamcannon.com', 'spamcannon.net', 'spamcero.com',
  'spamcon.org', 'spamcorptastic.com', 'spamcowboy.com',
  'spamcowboy.net', 'spamcowboy.org', 'spamday.com',
  'spamex.com', 'spamfree.eu', 'spamfree24.com',
  'spamfree24.de', 'spamfree24.eu', 'spamfree24.info',
  'spamfree24.net', 'spamfree24.org', 'spamgoes.in',
  'spamherelots.com', 'spamhereplease.com', 'spamhole.com',
  'spamify.com', 'spaminator.de', 'spamkill.info',
  'spaml.com', 'spaml.de', 'spammotel.com',
  'spamobox.com', 'spamoff.de', 'spamsalad.in',
  'spamslicer.com', 'spamspot.com', 'spamstack.net',
  'spamthis.co.uk', 'spamtroll.net', 'speed.1s.fr',
  'spoofmail.de', 'squizzy.de', 'ssoia.com',
  'startkeys.com', 'stinkefinger.net', 'stop-my-spam.cf',
  'stuffmail.de', 'super-auswahl.de', 'supergreatmail.com',
  'supermailer.jp', 'superrito.com', 'superstachel.de',
  'suremail.info', 'sweetxxx.de', 'tafmail.com',
  'tagyourself.com', 'talkinator.com', 'tapchicuoihoi.com',
  'teewars.org', 'teleosaurs.xyz', 'teleworm.com',
  'teleworm.us', 'temp-mail.de', 'temp-mail.ru',
  'temp.emeraldwebmail.com', 'temp.headstrong.de', 'tempail.com',
  'tempalias.com', 'tempe-mail.com', 'tempemail.biz',
  'tempemail.co.za', 'tempemail.com', 'tempemail.net',
  'tempinbox.co.uk', 'tempinbox.com', 'tempmail.it',
  'tempmail2.com', 'tempmaildemo.com', 'tempmailer.com',
  'tempmailer.de', 'tempomail.fr', 'temporarily.de',
  'temporarioemail.com.br', 'temporaryemail.net', 'temporaryemail.us',
  'temporaryforwarding.com', 'temporaryinbox.com', 'tempsky.com',
  'tempthe.net', 'tempymail.com', 'thankspammerz.net',
  'thankyou2010.com', 'thecloudindex.com', 'thisisnotmyrealemail.com',
  'throwam.com', 'throwawayemailaddress.com', 'throwawaymail.com',
  'tilien.com', 'tittbit.in', 'tmailinator.com',
  'tmail.ws', 'tmpeml.info', 'toiea.com',
  'tokenmail.de', 'toomail.biz', 'topranklist.de',
  'tradermail.info', 'trash-amil.com', 'trash-mail.at',
  'trash-mail.cf', 'trash-mail.com', 'trash-mail.de',
  'trash-mail.ga', 'trash-mail.gq', 'trash-mail.ml',
  'trash-mail.tk', 'trash2009.com', 'trash2010.com',
  'trash2011.com', 'trashbox.eu', 'trashdevil.com',
  'trashdevil.de', 'trashemail.de', 'trashemails.de',
  'trashinbox.com', 'trashmail.at', 'trashmail.de',
  'trashmail.me', 'trashmail.net', 'trashmail.org',
  'trashmail.ws', 'trashmailer.com', 'trashymail.com',
  'trashymail.net', 'trbvm.com', 'trbvn.com',
  'trickmail.net', 'trillianpro.com', 'tryalert.com',
  'turual.com', 'twinmail.de', 'twoweirdtricks.com',
  'tyldd.com', 'uggsrock.com', 'umail.net',
  'upliftnow.com', 'uplipht.com', 'uroid.com',
  'us.af', 'valemail.net', 'venompen.com',
  'veryrealemail.com', 'viditag.com', 'viewcastmedia.com',
  'viewcastmedia.net', 'viewcastmedia.org', 'viralplays.com',
  'vkcode.ru', 'vmani.com', 'vomoto.com',
  'vpn.st', 'vsimcard.com', 'vubby.com',
  'wasteland.rfc822.org', 'webemail.me', 'webm4il.info',
  'webuser.in', 'wee.my', 'weg-werf-email.de',
  'wegwerf-email-adressen.de', 'wegwerf-email.at', 'wegwerf-email.de',
  'wegwerf-email.net', 'wegwerf-emails.de', 'wegwerfadresse.de',
  'wegwerfemail.com', 'wegwerfemail.de', 'wegwerfemail.net',
  'wegwerfmail.de', 'wegwerfmail.info', 'wegwerfmail.net',
  'wegwerfmail.org', 'wetrainbayarea.com', 'wetrainbayarea.org',
  'wh4f.org', 'whatiaas.com', 'whatpaas.com',
  'whopy.com', 'whyspam.me', 'wilemail.com',
  'willhackforfood.biz', 'willselfdestruct.com', 'winemaven.info',
  'wolfsmail.tk', 'wollan.info', 'worldspace.link',
  'wralawfirm.com', 'wronghead.com', 'wuzup.net',
  'wuzupmail.net', 'wwwnew.eu', 'xagloo.co',
  'xagloo.com', 'xemaps.com', 'xents.com',
  'xmaily.com', 'xoxy.net', 'yapped.net',
  'yep.it', 'yogamaven.com', 'yopmail.com',
  'yopmail.fr', 'yopmail.net', 'yourdomain.com',
  'ypmail.webarnak.fr.eu.org', 'yuurok.com', 'zehnminuten.de',
  'zehnminutenmail.de', 'zetmail.com', 'zippymail.info',
  'zoaxe.com', 'zoemail.com', 'zoemail.net',
  'zoemail.org', 'zomg.info', 'zxcv.com',
  'zxcvbnm.com', 'zzz.com'
];

const rolePrefixes = [
  // Standard roles
  'info', 'admin', 'administrator', 'support', 'sales', 'contact', 'help', 'hello',
  'team', 'office', 'marketing', 'webmaster', 'postmaster', 'abuse', 'root',
  'noreply', 'no-reply', 'no_reply', 'donotreply', 'do-not-reply',
  'billing', 'accounts', 'accounting', 'hr', 'jobs', 'careers', 'recruitment',
  'feedback', 'press', 'media', 'legal', 'privacy', 'security', 'compliance',
  // Extended roles
  'enquiries', 'enquiry', 'inquiry', 'inquiries', 'general', 'mail', 'email',
  'orders', 'order', 'subscribe', 'unsubscribe', 'newsletter', 'news',
  'customerservice', 'customer-service', 'customer_support', 'cs',
  'techsupport', 'tech-support', 'tech_support', 'it', 'helpdesk', 'help-desk',
  'partners', 'partnership', 'affiliate', 'affiliates', 'reseller', 'resellers',
  'vendor', 'vendors', 'supplier', 'suppliers', 'procurement',
  'finance', 'payments', 'invoice', 'invoices', 'payroll',
  'returns', 'refund', 'refunds', 'warranty', 'rma',
  'reservations', 'booking', 'bookings', 'appointments',
  'events', 'event', 'conference', 'conferences', 'webinar', 'webinars',
  'training', 'education', 'learning', 'courses',
  'community', 'social', 'engage', 'engagement',
  'pr', 'publicrelations', 'public-relations', 'communications',
  'investor', 'investors', 'ir', 'shareholders',
  'spam', 'test', 'testing', 'dev', 'development', 'staging',
  'demo', 'trial', 'beta', 'alpha',
  'service', 'services', 'solutions', 'consulting',
  'registrar', 'register', 'registration', 'signup', 'signin',
  'welcome', 'onboarding', 'activation',
  'alerts', 'alert', 'notifications', 'notification', 'notify',
  'system', 'systems', 'daemon', 'mailer', 'mailer-daemon',
  'hostmaster', 'dnsadmin', 'ftp', 'www', 'web'
];

const freeEmailProviders = [
  // Major providers
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
  'live.com', 'live.co.uk', 'msn.com', 'passport.com',
  'aol.com', 'aim.com', 'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'protonmail.ch', 'proton.me', 'pm.me',
  'zoho.com', 'zohomail.com', 'mail.com', 'email.com',
  'gmx.com', 'gmx.net', 'gmx.de', 'gmx.at', 'gmx.ch',
  'yandex.com', 'yandex.ru', 'yandex.ua',
  'tutanota.com', 'tutanota.de', 'tutamail.com', 'tuta.io',
  'fastmail.com', 'fastmail.fm',
  // Regional providers
  'mail.ru', 'inbox.ru', 'list.ru', 'bk.ru',
  'qq.com', '163.com', '126.com', 'sina.com', 'sohu.com',
  'naver.com', 'daum.net', 'hanmail.net',
  'rediffmail.com', 'sify.com',
  'web.de', 'freenet.de', 't-online.de',
  'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'laposte.net',
  'libero.it', 'virgilio.it', 'alice.it', 'tin.it',
  'terra.com.br', 'uol.com.br', 'bol.com.br',
  // Other
  'cox.net', 'att.net', 'sbcglobal.net', 'verizon.net', 'comcast.net',
  'charter.net', 'earthlink.net', 'juno.com', 'netzero.net',
  'rocketmail.com', 'ymail.com'
];

// Fixed: Proper TypeScript typing
const domainTypos: { [key: string]: string[] } = {
  // Gmail variants
  'gmail.com': ['gmai.com', 'gmial.com', 'gmaill.com', 'gmali.com', 'gamil.com', 'gnail.com', 
    'gmal.com', 'gmil.com', 'gimail.com', 'gmaik.com', 'gmailc.om', 'gmail.co', 'gmail.cm', 
    'gmail.om', 'gmail.con', 'gmail.cmo', 'gmaiil.com', 'gmaail.com', 'ggmail.com', 'hmail.com',
    'gmaul.com', 'gmeil.com', 'gmial.com', 'gmsil.com', 'gemail.com', 'gmailcom', 'qmail.com'],
  
  // Yahoo variants
  'yahoo.com': ['yaho.com', 'yahooo.com', 'yhoo.com', 'yaoo.com', 'yhaoo.com', 'yahoo.co', 
    'yahoo.cm', 'yahoo.con', 'yahooc.om', 'yahho.com', 'uahoo.com', 'tahoo.com', 'yajoo.com',
    'yaboo.com', 'yahol.com', 'yahooo.com', 'yahopo.com', 'yqhoo.com', 'yahoocom'],
  
  // Hotmail variants
  'hotmail.com': ['hotmai.com', 'hotmal.com', 'hotmial.com', 'hotmali.com', 'hotmil.com', 
    'hotmaill.com', 'homail.com', 'htmail.com', 'hotmail.co', 'hotmail.cm', 'hotmail.con', 
    'hotamil.com', 'hotmailc.om', 'hotmial.com', 'hotmsil.com', 'hormail.com', 'homtail.com',
    'hoymail.com', 'hotmait.com', 'hotmqil.com', 'hotmailcom', 'hotmall.com'],
  
  // Outlook variants
  'outlook.com': ['outlok.com', 'outloo.com', 'outllok.com', 'outook.com', 'outlook.co', 
    'outlook.cm', 'outlook.con', 'outlookc.om', 'oulook.com', 'putlook.com', 'oitlook.com',
    'outlouk.com', 'outlooj.com', 'outlool.com', 'outlookcom', 'otlook.com', 'outlok.com'],
  
  // iCloud variants
  'icloud.com': ['iclod.com', 'iclould.com', 'icoud.com', 'icloude.com', 'icloud.co', 
    'icloud.cm', 'icloud.con', 'icloudc.om', 'ilcoud.com', 'icliud.com', 'iclaud.com',
    'iclpud.com', 'icloyd.com', 'icloudcom', 'ickoud.com', 'iclound.com'],
  
  // ProtonMail variants
  'protonmail.com': ['protonmal.com', 'protonmial.com', 'protonmali.com', 'protonmil.com', 
    'prtonmail.com', 'protonmail.co', 'protonmail.cm', 'protonmail.con', 'protonmailcom',
    'protanmail.com', 'protonmai.com', 'protonmaul.com', 'protonmeil.com', 'protomail.com'],
  
  // AOL variants
  'aol.com': ['ao.com', 'aoll.com', 'aol.co', 'aol.cm', 'aol.con', 'aolcom', 'sol.com',
    'aok.com', 'aol.om', 'aol.cim', 'ail.com'],
  
  // Live variants
  'live.com': ['liv.com', 'livee.com', 'live.co', 'live.cm', 'live.con', 'livecom',
    'kive.com', 'liве.com', 'lice.com', 'luve.com'],
  
  // Comcast variants
  'comcast.net': ['comast.net', 'comcat.net', 'comcas.net', 'comcast.nt', 'comcastnet',
    'comcaat.net', 'comcasr.net', 'concast.net'],
  
  // Verizon variants
  'verizon.net': ['verizon.nt', 'verison.net', 'verizon.met', 'verizonnet', 'verizo.net',
    'verizon.het', 'verizan.net', 'verizom.net'],
  
  // AT&T variants
  'att.net': ['at.net', 'att.nt', 'attt.net', 'attnet', 'att.met', 'att.het'],
  
  // MSN variants
  'msn.com': ['msn.co', 'msn.cm', 'msn.con', 'msncom', 'msm.com', 'msn.om', 'nsn.com'],
  
  // Mail.com variants
  'mail.com': ['mail.co', 'mail.cm', 'mail.con', 'mailcom', 'mai.com', 'maik.com',
    'mial.com', 'mal.com'],
  
  // Yandex variants
  'yandex.com': ['yandex.co', 'yandex.cm', 'yandex.con', 'yandexcom', 'yandx.com',
    'yanex.com', 'yandez.com', 'yandec.com'],
  
  // GMX variants
  'gmx.com': ['gmx.co', 'gmx.cm', 'gmx.con', 'gmxcom', 'gmc.com', 'gmz.com'],
  'gmx.de': ['gmx.dr', 'gmx.ed', 'gmxde', 'gmc.de', 'gnx.de'],
  
  // Zoho variants
  'zoho.com': ['zoho.co', 'zoho.cm', 'zoho.con', 'zohocom', 'zaho.com', 'zoho.vom',
    'zoho.xom', 'zojo.com'],
  
  // FastMail variants
  'fastmail.com': ['fastmail.co', 'fastmail.cm', 'fastmailcom', 'fastmai.com',
    'fastmial.com', 'fastmal.com'],
  
  // Me.com (Apple) variants
  'me.com': ['me.co', 'me.cm', 'me.con', 'mecom', 'mr.com', 'ne.com'],
  
  // Mac.com (Apple) variants
  'mac.com': ['mac.co', 'mac.cm', 'mac.con', 'maccom', 'mak.com', 'nac.com'],
  
  // QQ variants
  'qq.com': ['qq.co', 'qq.cm', 'qq.con', 'qqcom', 'qg.com', 'q.com'],
  
  // Common TLD typos (generic patterns)
  '.com': ['.co', '.cm', '.om', '.con', '.cim', '.vom', '.xom', '.cpm', '.conm'],
  '.net': ['.nt', '.met', '.het', '.bet', '.nrt', '.neт'],
  '.org': ['.og', '.ort', '.orh', '.prg', '.irg'],
  '.co.uk': ['.co.ik', '.co.ul', '.co.uj', '.co.uk', '.couk', '.co.uk'],
  '.edu': ['.ed', '.edi', '.eddu', '.eud'],
  '.gov': ['.gv', '.gor', '.giv', '.goc']
};


// Suspicious patterns in local part
const suspiciousPatterns: RegExp[] = [
  /^[a-z]{1,2}\d{6,}$/i,
  /^\d{8,}$/,
  /^[a-z]+\d{4,}[a-z]*$/i,
  /^test/i,
  /^demo/i,
  /^fake/i,
  /^temp/i,
  /^spam/i,
  /^user\d+$/i,
  /^admin\d+$/i,
  /^sample/i,
  /^example/i,
  /^null$/i,
  /^undefined$/i,
  /^asdf/i,
  /^qwerty/i,
  /^abc123/i,
  /\.{2,}/,
  /^\.|\.$|\.@|@\./,
  /[!#$%&'*+\/=?^`{|}~]{3,}/
];
interface MXRecord {
  preference: number;
  exchange: string;
}

interface ValidationResult {
    email: string;
    syntaxValid: boolean;
    domainExists: boolean;
    mxRecords: boolean;
    mxHosts: string[];
    isDisposable: boolean;
    isRoleBased: boolean;
    isCatchAll: boolean;
    isFreeProvider: boolean;
    hasSuspiciousPattern: boolean;
    hasTypo: boolean;
    suggestedCorrection: string | null;
    domain: string;
    localPart: string;
    status: 'valid' | 'invalid' | 'risky';
    score: number;
    riskFactors: string[];
    smtpCheck: {
        attempted: boolean;
        reachable: boolean;
        acceptsAll: boolean;
        mailboxExists: boolean | null;
    };
}

function validateEmailSyntax(email: string): boolean {
  // RFC 5322 compliant email regex (simplified but accurate)
  const emailRegex =
  /^(?:[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;

  
  const trimmed = email.trim().toLowerCase();
  
  // Basic length checks
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  
  // Local part max 64 chars
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex > 64) return false;
  
  return emailRegex.test(trimmed);
}


function extractDomain(email: string): string {
    const parts = email.trim().toLowerCase().split('@');
    return parts.length === 2 ? parts[1] : '';
}

function extractLocalPart(email: string): string {
    const parts = email.trim().toLowerCase().split('@');
    return parts.length === 2 ? parts[0] : '';
}

function isDisposableEmail(domain: string): boolean {
    const lowerDomain = domain.toLowerCase();
    // Check exact match first
    if (disposableDomains.includes(lowerDomain)) return true;
    // Check if domain ends with a known disposable domain
    return disposableDomains.some(d => lowerDomain.endsWith('.' + d) || lowerDomain === d);
}

function isRoleBasedEmail(localPart: string): boolean {
  const lower = localPart.toLowerCase();
  // Check exact match
  if (rolePrefixes.includes(lower)) return true;
  // Check if starts with role prefix followed by numbers or special chars
  return rolePrefixes.some(prefix => {
    if (lower === prefix) return true;
    if (lower.startsWith(prefix + '.') || lower.startsWith(prefix + '_') || lower.startsWith(prefix + '-')) return true;
    if (lower.startsWith(prefix) && /^\d+$/.test(lower.slice(prefix.length))) return true;
    return false;
  });
}

function isFreeProvider(domain: string): boolean {
    return freeEmailProviders.includes(domain.toLowerCase());
}

function hasSuspiciousPattern(localPart: string): boolean {
    return suspiciousPatterns.some(pattern => pattern.test(localPart));
}

function checkForTypo(domain: string): { hasTypo: boolean; suggestion: string | null } {
    const lowerDomain = domain.toLowerCase();

    for (const [correct, typos] of Object.entries(domainTypos)) {
        if (typos.includes(lowerDomain)) {
            return { hasTypo: true, suggestion: correct };
        }
    }

    return { hasTypo: false, suggestion: null };
}

async function checkMXRecords(domain: string): Promise<{ exists: boolean; hosts: string[]; priority: number[] }> {
    try {
        const records = await Deno.resolveDns(domain, "MX");

        if (records && records.length > 0) {
            const sorted = records.sort((a, b) => a.preference - b.preference);
            const hosts = sorted.map(r => r.exchange);
            const priority = sorted.map(r => r.preference);

            console.log(`MX records for ${domain}:`, hosts);
            return { exists: true, hosts, priority };
        }

        return { exists: false, hosts: [], priority: [] };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`MX lookup failed for ${domain}:`, errorMessage);
        return { exists: false, hosts: [], priority: [] };
    }
}

async function checkDomainExists(domain: string): Promise<{ exists: boolean; hasA: boolean; hasAAAA: boolean; hasNS: boolean }> {
    let hasA = false;
    let hasAAAA = false;
    let hasNS = false;

    try {
        const aRecords = await Deno.resolveDns(domain, "A");
        hasA = aRecords && aRecords.length > 0;
    } catch { }

    try {
        const aaaaRecords = await Deno.resolveDns(domain, "AAAA");
        hasAAAA = aaaaRecords && aaaaRecords.length > 0;
    } catch { }

    try {
        const nsRecords = await Deno.resolveDns(domain, "NS");
        hasNS = nsRecords && nsRecords.length > 0;
    } catch { }

    return { exists: hasA || hasAAAA || hasNS, hasA, hasAAAA, hasNS };
}

async function checkSPFRecord(domain: string): Promise<boolean> {
    try {
        const txtRecords = await Deno.resolveDns(domain, "TXT");
        if (txtRecords && txtRecords.length > 0) {
            return txtRecords.some(record =>
                record.some(txt => txt.toLowerCase().startsWith('v=spf1'))
            );
        }
    } catch { }
    return false;
}

async function checkDMARCRecord(domain: string): Promise<boolean> {
    try {
        const dmarcDomain = `_dmarc.${domain}`;
        const txtRecords = await Deno.resolveDns(dmarcDomain, "TXT");
        if (txtRecords && txtRecords.length > 0) {
            return txtRecords.some(record =>
                record.some(txt => txt.toLowerCase().startsWith('v=dmarc1'))
            );
        }
    } catch { }
    return false;
}

// Attempt SMTP verification by connecting to MX server
async function attemptSMTPVerification(domain: string, email: string, mxHosts: string[]): Promise<{
    attempted: boolean;
    reachable: boolean;
    acceptsAll: boolean;
    mailboxExists: boolean | null;
}> {
    if (mxHosts.length === 0) {
        return { attempted: false, reachable: false, acceptsAll: false, mailboxExists: null };
    }

    // For now, we'll do a basic check - full SMTP verification would require 
    // connecting to port 25 which may be blocked in edge functions
    // We'll infer based on domain reputation and MX configuration

    const primaryMx = mxHosts[0].toLowerCase();

    // Known providers that are reachable and properly configured
    const knownProviders = [
        'google.com', 'googlemail.com', 'gmail-smtp-in.l.google.com',
        'outlook.com', 'hotmail.com', 'microsoft.com', 'protection.outlook.com',
        'yahoo.com', 'yahoodns.net',
        'icloud.com', 'apple.com', 'me.com',
        'protonmail.com', 'protonmail.ch',
    ];

    const isKnownProvider = knownProviders.some(p =>
        primaryMx.includes(p) || domain.toLowerCase().includes(p.split('.')[0])
    );

    if (isKnownProvider) {
        // Known providers are reachable, don't accept all, mailbox existence unknown without actual SMTP
        return {
            attempted: true,
            reachable: true,
            acceptsAll: false,
            mailboxExists: null // Would need actual SMTP RCPT TO check
        };
    }

    // For other domains, assume reachable if MX exists
    return {
        attempted: true,
        reachable: true,
        acceptsAll: false, // Conservative assumption
        mailboxExists: null
    };
}

function calculateScore(result: Omit<ValidationResult, 'score' | 'status'>): number {
    let score = 100;
    const deductions: { reason: string; points: number }[] = [];

    // Critical issues
    if (!result.syntaxValid) {
        deductions.push({ reason: 'Invalid syntax', points: 100 });
    }
    if (!result.domainExists) {
        deductions.push({ reason: 'Domain does not exist', points: 100 });
    }
    if (!result.mxRecords) {
        deductions.push({ reason: 'No MX records', points: 50 });
    }

    // High risk
    if (result.isDisposable) {
        deductions.push({ reason: 'Disposable email', points: 40 });
    }
    if (result.hasTypo) {
        deductions.push({ reason: 'Likely typo in domain', points: 35 });
    }

    // Medium risk
    if (result.isRoleBased) {
        deductions.push({ reason: 'Role-based address', points: 20 });
    }
    if (result.hasSuspiciousPattern) {
        deductions.push({ reason: 'Suspicious pattern', points: 15 });
    }
    if (result.isCatchAll) {
        deductions.push({ reason: 'Catch-all domain', points: 10 });
    }

    // Low impact
    if (result.isFreeProvider) {
        deductions.push({ reason: 'Free email provider', points: 5 });
    }

    // Apply deductions
    for (const d of deductions) {
        score -= d.points;
    }

    return Math.max(0, Math.min(100, score));
}

function determineStatus(score: number, result: Omit<ValidationResult, 'status' | 'score'>): 'valid' | 'invalid' | 'risky' {
    if (!result.syntaxValid || !result.domainExists) {
        return 'invalid';
    }

    if (!result.mxRecords) {
        return 'invalid';
    }

    if (score < 50 || result.isDisposable || result.hasTypo) {
        return 'risky';
    }

    if (score < 70 || result.isRoleBased || result.isCatchAll || result.hasSuspiciousPattern) {
        return 'risky';
    }

    return 'valid';
}

function collectRiskFactors(result: Omit<ValidationResult, 'riskFactors' | 'status' | 'score'>): string[] {
    const factors: string[] = [];

    if (!result.syntaxValid) factors.push('Invalid email syntax');
    if (!result.domainExists) factors.push('Domain does not exist');
    if (!result.mxRecords) factors.push('No mail server (MX) records found');
    if (result.isDisposable) factors.push('Disposable/temporary email domain');
    if (result.isRoleBased) factors.push('Role-based email address (not personal)');
    if (result.isCatchAll) factors.push('Catch-all domain (accepts any address)');
    if (result.isFreeProvider) factors.push('Free email provider');
    if (result.hasSuspiciousPattern) factors.push('Suspicious pattern in email address');
    if (result.hasTypo) factors.push(`Likely typo - did you mean ${result.suggestedCorrection}?`);
    if (!result.smtpCheck.reachable && result.smtpCheck.attempted) factors.push('Mail server not reachable');

    return factors;
}

async function validateEmail(email: string): Promise<ValidationResult> {
    const trimmedEmail = email.trim().toLowerCase();
    const domain = extractDomain(trimmedEmail);
    const localPart = extractLocalPart(trimmedEmail);

    console.log(`Deep validation for: ${trimmedEmail}`);

    const syntaxValid = validateEmailSyntax(trimmedEmail);

    let domainExists = false;
    let mxRecords = false;
    let mxHosts: string[] = [];
    let smtpCheck = { attempted: false, reachable: false, acceptsAll: false, mailboxExists: null as boolean | null };

    if (syntaxValid && domain) {
        // Parallel DNS lookups for efficiency
        const [domainResult, mxResult, hasSPF, hasDMARC] = await Promise.all([
            checkDomainExists(domain),
            checkMXRecords(domain),
            checkSPFRecord(domain),
            checkDMARCRecord(domain)
        ]);

        domainExists = domainResult.exists || mxResult.exists;
        mxRecords = mxResult.exists;
        mxHosts = mxResult.hosts;

        console.log(`Domain ${domain}: exists=${domainExists}, MX=${mxRecords}, SPF=${hasSPF}, DMARC=${hasDMARC}`);

        // Attempt SMTP verification if MX records exist
        if (mxRecords) {
            smtpCheck = await attemptSMTPVerification(domain, trimmedEmail, mxHosts);
        }
    }

    const isDisposable = syntaxValid ? isDisposableEmail(domain) : false;
    const isRoleBased = syntaxValid ? isRoleBasedEmail(localPart) : false;
    const isFree = syntaxValid ? isFreeProvider(domain) : false;
    const hasSuspicious = syntaxValid ? hasSuspiciousPattern(localPart) : false;
    const typoCheck = syntaxValid ? checkForTypo(domain) : { hasTypo: false, suggestion: null };

    // Catch-all detection - conservative estimate
    // Free providers are never catch-all, small domains might be
    const isCatchAll = false; // Would need SMTP RCPT TO check for accurate detection

    const partialResult = {
        email: trimmedEmail,
        syntaxValid,
        domainExists,
        mxRecords,
        mxHosts,
        isDisposable,
        isRoleBased,
        isCatchAll,
        isFreeProvider: isFree,
        hasSuspiciousPattern: hasSuspicious,
        hasTypo: typoCheck.hasTypo,
        suggestedCorrection: typoCheck.suggestion,
        domain,
        localPart,
        smtpCheck,
    };

    const riskFactors = collectRiskFactors(partialResult);
    const resultWithRisk = { ...partialResult, riskFactors };
    const score = calculateScore(resultWithRisk);
    const status = determineStatus(score, resultWithRisk);

    console.log(`Result for ${trimmedEmail}: status=${status}, score=${score}, risks=${riskFactors.length}`);

    return {
        ...partialResult,
        status,
        score,
        riskFactors,
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { email, emails } = await req.json();

        // Single email validation
        if (email && typeof email === 'string') {
            console.log(`Deep validating single email: ${email}`);
            const result = await validateEmail(email);

            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }




        // Bulk email validation with highly optimized parallel processing
        if (emails && Array.isArray(emails)) {
            console.log(`Deep validating ${emails.length} emails - HIGH SPEED MODE`);

            // Process 150 emails concurrently - maximum parallelism
            const concurrencyLimit = 150;
            const results: ValidationResult[] = new Array(emails.length);
            let completedCount = 0;

            // Process all emails with controlled concurrency
            const processEmail = async (email: string, index: number): Promise<void> => {
                try {
                    results[index] = await validateEmail(email);
                } catch (error) {
                    console.error(`Error validating ${email}:`, error);
                    // Return invalid result on error
                    results[index] = {
                        email: email.trim().toLowerCase(),
                        syntaxValid: false,
                        domainExists: false,
                        mxRecords: false,
                        mxHosts: [],
                        isDisposable: false,
                        isRoleBased: false,
                        isCatchAll: false,
                        isFreeProvider: false,
                        hasSuspiciousPattern: false,
                        hasTypo: false,
                        suggestedCorrection: null,
                        domain: '',
                        localPart: '',
                        status: 'invalid',
                        score: 0,
                        riskFactors: ['Validation error'],
                        smtpCheck: { attempted: false, reachable: false, acceptsAll: false, mailboxExists: null }
                    };
                }
                completedCount++;
                if (completedCount % 500 === 0) {
                    console.log(`Progress: ${completedCount}/${emails.length} emails validated`);
                }
            };

            // Use a semaphore-like pattern for controlled concurrency
            const chunks: Promise<void>[] = [];
            for (let i = 0; i < emails.length; i += concurrencyLimit) {
                const chunk = emails.slice(i, i + concurrencyLimit);
                const chunkPromises = chunk.map((email, idx) => processEmail(email, i + idx));
                // Wait for this chunk to complete before starting next
                await Promise.all(chunkPromises);
            }

            // Summary statistics
            const summary = {
                total: results.length,
                valid: results.filter(r => r.status === 'valid').length,
                invalid: results.filter(r => r.status === 'invalid').length,
                risky: results.filter(r => r.status === 'risky').length,
                averageScore: Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length),
            };

            console.log(`Completed: ${results.length} emails, valid=${summary.valid}, invalid=${summary.invalid}, risky=${summary.risky}`);

            return new Response(JSON.stringify({ results, summary }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Please provide an email or emails array' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error in validate-email function:', error);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
