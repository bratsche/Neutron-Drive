from django.template.response import TemplateResponse

def home (request):
  c = {}
  return TemplateResponse(request, 'main/home.html', c)
  