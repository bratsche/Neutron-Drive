import json

from django import http

def JsonResponse (data):
  return http.HttpResponse(json.dumps(data), content_type='application/json')
  