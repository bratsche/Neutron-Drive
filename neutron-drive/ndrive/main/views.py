import os
import json
import logging
import datetime

from django import http
from django.conf import settings
from django.template.response import TemplateResponse
from django.core.urlresolvers import reverse
from django.template.loader import render_to_string

from oauth2client.client import OAuth2WebServerFlow
from oauth2client.client import FlowExchangeError
from oauth2client.client import AccessTokenRefreshError

from oauth2client.appengine import StorageByKeyName
from oauth2client.appengine import simplejson as json

from ndrive.main.models import Credentials, Preferences, ETHEMES, ESIZES, EKBINDS, EWRAPS
from ndrive.main.utils import JsonResponse, MediaInMemoryUpload, CreateService, ALL_SCOPES, get_or_create
from ndrive.settings.editor import MODES, THEMES

def verify (request):
  return TemplateResponse(request, 'google442b861f8353f428.html', {})
  
def home (request):
  c = {
    'NDEBUG': settings.NDEBUG
  }
  return TemplateResponse(request, 'main/home.html', c)
  
def about (request):
  return TemplateResponse(request, 'main/about.html', {})
  
def license (request):
  return TemplateResponse(request, 'main/license.html', {})
  
class DriveAuth (object):
  def __init__ (self, request):
    self.request = request
    self.userid = None
    
  def CreateOAuthFlow (self):
    flow = OAuth2WebServerFlow(
      settings.GOOGLE_API_CLIENT_ID,
      settings.GOOGLE_API_CLIENT_SECRET,
      '',   # scope
      None, # user_agent
      settings.GOOGLE_AUTH_URI,
      settings.GOOGLE_TOKEN_URI
    )
    
    uri = 'http://' + self.request.get_host()
    if self.request.is_secure():
      uri = 'https://' + self.request.get_host()
      
    flow.redirect_uri = uri + self.request.path
    return flow
    
  def get_credentials (self, check_cookie=True):
    if check_cookie:
      creds = self.get_session_credentials()
      if creds:
        return creds
        
    code = self.request.REQUEST.get('code', '')
    if not code:
      return None
      
    oauth_flow = self.CreateOAuthFlow()
    
    try:
      creds = oauth_flow.step2_exchange(code)
      
    except FlowExchangeError:
      return None
      
    users_service = CreateService('oauth2', 'v2', creds)
    info = users_service.userinfo().get().execute()
    self.userid = info.get('id')
    email = info.get('email')
    created, self.prefs = get_or_create(Preferences, queries=(('userid =', self.userid),), defaults={'userid': self.userid, 'email': email})
    if created:
      self.prefs.put()
      
    StorageByKeyName(Credentials, self.userid, 'credentials').put(creds)
    return creds
    
  def get_session_credentials (self):
    userid = self.request.get_signed_cookie(settings.USERID_COOKIE, default=None, salt=settings.SALT)
    if userid:
      creds = StorageByKeyName(Credentials, userid, 'credentials').get()
      if creds and creds.invalid:
        return None
        
      self.userid = userid
      self.prefs = Preferences.all().filter('userid =', self.userid).get()
      return creds
      
    return None
    
  def redirect_auth (self):
    flow = self.CreateOAuthFlow()
    flow.scope = ALL_SCOPES
    uri = flow.step1_get_authorize_url(flow.redirect_uri)
    return http.HttpResponseRedirect(uri)
    
def edit_old (request):
  da = DriveAuth(request)
  creds = da.get_credentials()
  if creds is None:
    return da.redirect_auth()
    
  response = TemplateResponse(request, 'main/edit_old.html', {})
  response.set_signed_cookie(settings.USERID_COOKIE, value=da.userid, salt=settings.SALT)
  
  return response
  
def edit (request):
  da = DriveAuth(request)
  creds = da.get_credentials(check_cookie=False)
  
  if creds is None:
    return da.redirect_auth()
    
  #code = request.REQUEST.get('code', '')
  #if code:
  #  response = http.HttpResponseRedirect(reverse('edit'))
  #  
  #else:
  
  state = request.REQUEST.get('state', '')
  open_ids = []
  if state:
    state = json.loads(state)
    open_ids = state["ids"]
    
  c = {
    'MODES': MODES,
    'NDEBUG': settings.NDEBUG,
    'CLIENT_ID': settings.GOOGLE_API_CLIENT_ID.split('.')[0],
    'prefs': da.prefs,
    'themes': ETHEMES,
    'sizes': ESIZES,
    'binds': EKBINDS,
    'wraps': EWRAPS,
    'open_ids': open_ids,
  }
  response = TemplateResponse(request, 'main/edit.html', c)
  
  expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=settings.MAX_AGE)
  response.set_signed_cookie(settings.USERID_COOKIE, value=da.userid, salt=settings.SALT)
  return response
  
def prefs (request):
  da = DriveAuth(request)
  creds = da.get_session_credentials()
  
  if creds is not None:
    da.prefs.theme = request.POST.get('theme')
    da.prefs.fontsize = request.POST.get('fontsize')
    da.prefs.keybind = request.POST.get('keybind')
    da.prefs.swrap = request.POST.get('swrap')
    
    da.prefs.tabsize = int(request.POST.get('tabsize'))
    
    da.prefs.hactive = request.POST.get('hactive') == 'true'
    da.prefs.hword = request.POST.get('hword') == 'true'
    da.prefs.invisibles = request.POST.get('invisibles') == 'true'
    da.prefs.gutter = request.POST.get('gutter') == 'true'
    da.prefs.pmargin = request.POST.get('pmargin') == 'true'
    da.prefs.softab = request.POST.get('softab') == 'true'
    da.prefs.behave = request.POST.get('behave') == 'true'
    
    da.prefs.save_session = request.POST.get('save_session') == 'true'
    
    da.prefs.put()
    
    return JsonResponse()
    
def shatner (request):
  da = DriveAuth(request)
  creds = da.get_session_credentials()
  if creds is None:
    return JsonResponse({'status': 'auth_needed'})
    
  task = request.POST.get('task', '')
  if task in ('open', 'new', 'save'):
    service = CreateService('drive', 'v2', creds)
    
    if service is None:
      return JsonResponse({'status': 'no_service'})
      
    if task == 'open':
      file_id = request.POST.get('file_id', '')
      if file_id:
        try:
          f = service.files().get(fileId=file_id).execute()
          
        except AccessTokenRefreshError:
          return JsonResponse({'status': 'auth_needed'})
          
        downloadUrl = f.get('downloadUrl')
        
        if downloadUrl:
          resp, f['content'] = service._http.request(downloadUrl)
          
        else:
          f['content'] = ''
          
        return JsonResponse({'status': 'ok', 'file': f})
        
      return JsonResponse({'status': 'Invalid File'})
      
    elif task == 'save':
      name = request.POST.get('name')
      mimetype = request.POST.get('mimetype')
      content = request.POST.get('content')
      file_id = request.POST.get('file_id', '')
      new_file = request.POST.get('new_file')
      major = request.POST.get('major', '')
      md5hash = request.POST.get('md5hash', '')
      undos = int(request.POST.get('undos', '0'))
      
      new_revision = False
      if major == 'true':
        new_revision = True
        
      resource = {
        'title': name,
        'mimeType': mimetype
      }
      
      file = MediaInMemoryUpload(content, mimetype)
      
      try:
        if new_file == 'false':
          google = service.files().update(fileId=file_id, newRevision=new_revision, body=resource, media_body=file).execute()
          
        else:
          google = service.files().insert(body=resource, media_body=file).execute()
          
      except AccessTokenRefreshError:
        return JsonResponse({'status': 'auth_needed'})
        
      else:
        file_id = google['id']
        
      return JsonResponse(ok={'file_id': file_id, 'md5hash': md5hash, 'undos': undos})
      
  return http.HttpResponseBadRequest('Invalid Task', mimetype='text/plain')
  
def file_tree (request):
  da = DriveAuth(request)
  creds = da.get_session_credentials()
  if creds is None:
    return http.HttpResponseForbidden('Not Authorized', mimetype='text/plain')
    
  service = CreateService('drive', 'v2', creds)
  d = request.POST.get('dir', '')
  dirs = [] 
  flist = []
  page_token = None
  
  logging.info(d)
  while 1:
    param = {}  
    if page_token:
      param['pageToken'] = page_token
      
    if d:
      param['q'] = "'%s' in parents" % d[:-1]
      
    files = service.files().list(**param).execute()
      
    for f in files.get('items', []):
      f['ext'] = ''
      if f.has_key('fileExtension'):
        f['ext'] = f['fileExtension']
        
      isDir = False
      if f['ext'] == '' and f.has_key('mimeType') and f['mimeType'] == 'application/vnd.google-apps.folder':
        isDir = True
        
      add = False
      if d:
        add = True
          
      else:
        if isDir and f['parents'] and f['parents'][0]['isRoot']:
          add = True
          
        if not f['parents']:
          add = True
        
      if add:
        if isDir:
          dirs.append((f['title'], '<li class="directory collapsed" title="%s"><a href="#" rel="%s/">%s</a></li>' % (f['title'], f['id'], f['title'])))
          
        else:
          flist.append((f['title'], '<li class="file ext_%(ext)s"><a href="#" rel="%(id)s" data-title="%(title)s" data-url="%(alternateLink)s" data-mime="%(mimeType)s" data-ext="%(ext)s">%(title)s</a></li>' % f))
          
    page_token = files.get('nextPageToken')
    if not page_token:
      break
    
  flist = sorted(flist, key=lambda x: x[0].lower())
  dirs = sorted(dirs, key=lambda x: x[0].lower())
  
  dirs = [y for (x, y) in dirs if True]
  flist = [y for (x, y) in flist if True]
  
  r = ['<ul class="jqueryFileTree" style="display: none;">'] + dirs + flist + ['</ul>']
  return http.HttpResponse(''.join(r))
  