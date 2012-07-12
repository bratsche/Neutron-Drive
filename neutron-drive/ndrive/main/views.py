import json
import logging

from django import http
from django.conf import settings
from django.template.response import TemplateResponse
from django.core.urlresolvers import reverse

from oauth2client.client import OAuth2WebServerFlow
from oauth2client.client import FlowExchangeError
from oauth2client.client import AccessTokenRefreshError

from oauth2client.appengine import StorageByKeyName
from oauth2client.appengine import simplejson as json

from ndrive.main.models import Credentials
from ndrive.main.utils import JsonResponse, MediaInMemoryUpload, CreateService, ALL_SCOPES
from ndrive.settings.editor import MODES, THEMES

def home (request):
  c = {}
  return TemplateResponse(request, 'main/home.html', c)
  
def about (request):
  return TemplateResponse(request, 'main/about.html', {})
  

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

  def get_credentials (self):
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
    self.userid = users_service.userinfo().get().execute().get('id')
    
    StorageByKeyName(Credentials, self.userid, 'credentials').put(creds)
    return creds
    
  def get_session_credentials (self):
    userid = self.request.get_signed_cookie(settings.USERID_COOKIE, default=None, salt=settings.SALT)
    if userid:
      creds = StorageByKeyName(Credentials, userid, 'credentials').get()
      if creds and creds.invalid:
        return None
        
      self.userid = userid
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
  creds = da.get_credentials()
  
  if creds is None:
    return da.redirect_auth()
    
  code = request.REQUEST.get('code', '')
  if code:
    response = http.HttpResponseRedirect(reverse('edit'))
    
  else:
    c = {
      'MODES': MODES,
      'NDEBUG': settings.DEBUG,
      'CLIENT_ID': settings.GOOGLE_API_CLIENT_ID.split('.')[0],
    }
    response = TemplateResponse(request, 'main/edit.html', c)
    
  response.set_signed_cookie(settings.USERID_COOKIE, value=da.userid, salt=settings.SALT, max_age=settings.MAX_AGE)
  return response
  
def shatner (request):
  da = DriveAuth(request)
  creds = da.get_session_credentials()
  if creds is None:
    return JsonResponse({'status': 'auth_needed'})
    
  task = request.POST.get('task', '')
  if task in ('open', 'new', 'save'):
    service = CreateService('drive', 'v1', creds)
    
    if service is None:
      return JsonResponse({'status': 'no_service'})
      
    if task == 'open':
      file_id = request.POST.get('file_id', '')
      if file_id:
        try:
          f = service.files().get(id=file_id).execute()
          
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
      
      resource = {
        'title': name,
        'mimeType': mimetype
      }
      
      file = MediaInMemoryUpload(content, mimetype)
      
      try:
        if new_file == 'false':
          google = service.files().update(id=file_id, newRevision=True, body=resource, media_body=file).execute()
          
        else:
          google = service.files().insert(body=resource, media_body=file).execute()
          
      except AccessTokenRefreshError:
        return JsonResponse({'status': 'auth_needed'})
        
      else:
        file_id = google['id']
        
      return JsonResponse(ok={'file_id': file_id})
      
  return http.HttpResponseBadRequest('Invalid Task', mimetype='text/plain')
  