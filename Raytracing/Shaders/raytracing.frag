#version 430

#define EPSILON = 0.001
#define BIG = 1000000.0
const int DIFFUSE = 1;
const int REFLECTION = 2;
const int REFRACTION = 3; 
const int DIFFUSE_REFLECTION = 1; 
const int MIRROR_REFLECTION = 2;
const int MAX_STACK_SIZE = 10;       // Максимальный размер стека для лучей
const int MAX_TRACE_DEPTH = 8;       // Максимальная глубина трассировки
const vec3 Unit = vec3 ( 1.0, 1.0, 1.0 ); // Единичный вектор
out vec4 FragColor;
in vec3 glPosition;
uniform vec3 cube_color;
uniform vec3 camera_position;
 

 // Структура для хранения параметров камеры
struct SCamera 
{
    vec3 Position;
    vec3 View;
    vec3 Up;
    vec3 Side;
    vec2 Scale;
}; 
 

 // Структура луча
struct SRay {
    vec3 Origin;     //точка начала
	vec3 Direction;  //направление
}; 
 

// Структура сферы
struct SSphere
{    
    vec3 Center;     // Центр сферы
    float Radius;    // Радиус сферы
    int MaterialIdx; // Индекс материала
};


// Структура треугольника
struct STriangle 
{     
    vec3 v1;        // Первая вершина
    vec3 v2;        // Вторая вершина
    vec3 v3;        // Третья вершина
    int MaterialIdx; // Индекс материала
};


// Структура материала
struct SMaterial 
{  
    vec3 Color;             // Цвет материала
    vec4 LightCoeffs;       // Коэффициенты освещения (ambient, diffuse, specular, shininess)
    float ReflectionCoef;   // Коэффициент отражения
    float RefractionCoef;   // Коэффициент преломления
    int MaterialType;       // Тип материала (диффузный, зеркальный и т.д.)
};


// Структура куба (состоит из 12 треугольников)
struct SCube 
{
    STriangle bounds[12];   // 12 треугольников, составляющих куб
    int MaterialIdx;        // Индекс материала куба
};


// Структура для хранения информации о пересечении
struct SIntersection 
{     
    float Time;             // Параметр пересечения (расстояние вдоль луча)
    vec3 Point;             // Точка пересечения
    vec3 Normal;            // Нормаль в точке пересечения
    vec3 Color;             // Цвет в точке пересечения
    vec4 LightCoeffs;       // Коэффициенты освещения
    float ReflectionCoef;   // Коэффициент отражения
    float RefractionCoef;   // Коэффициент преломления
    int MaterialType;       // Тип материала
};


// Структура источника света
struct SLight 
{ 
    vec3 Position;          // Позиция источника света
};


// Структура для хранения трассируемого луча и его свойств
struct STracingRay 
{ 
    SRay ray;              // Сам луч
    float contribution;    // Вклад этого луча в итоговый цвет
    int depth;            // Глубина рекурсии (количество отражений)
};


// Глобальные переменные сцены
STriangle Triangles[12];   // Массив треугольников сцены
SSphere Spheres[2];        // Массив сфер сцены
SCube cube;                // Куб сцены
SMaterial Materials[8];    // Массив материалов
SLight uLight;             // Источник света
SCamera uCamera;           // Камера


// Функция генерации луча через текущий пиксель
SRay GenerateRay ( SCamera uCamera )
{  
    // Преобразование координат экрана в координаты камеры
    vec2 coords = glPosition.xy * uCamera.Scale;
    // Вычисление направления луча
    vec3 direction = uCamera.View + uCamera.Side * coords.x + uCamera.Up * coords.y;
    return SRay ( uCamera.Position, normalize(direction) );
}


// Инициализация сцены по умолчанию
void initializeDefaultScene (out STriangle triangles[12], out SSphere spheres[2])
{
    // Инициализация 12 треугольников, образующих комнату (6 граней куба по 2 треугольника каждая)
    triangles[0].v1 = vec3(-5.0,-5.0,-8.0); 
	triangles[0].v2 = vec3(-5.0, 5.0, 5.0); 
	triangles[0].v3 = vec3(-5.0, 5.0,-8.0); 
	triangles[0].MaterialIdx = 0; 
 
    triangles[1].v1 = vec3(-5.0,-5.0,-8.0);
	triangles[1].v2 = vec3(-5.0,-5.0, 5.0);
	triangles[1].v3 = vec3(-5.0, 5.0, 5.0); 
	triangles[1].MaterialIdx = 0;
	
	triangles[2].v1 = vec3(-5.0, 5.0, 5.0); 
	triangles[2].v2 = vec3(-5.0, -5.0, 5.0); 
	triangles[2].v3 = vec3(5.0, -5.0, 5.0); 
	triangles[2].MaterialIdx = 1; 
 
    triangles[3].v1 = vec3(5.0,-5.0, 5.0);
	triangles[3].v2 = vec3(5.0, 5.0, 5.0);
	triangles[3].v3 = vec3(-5.0, 5.0, 5.0); 
	triangles[3].MaterialIdx = 1;
	
	triangles[4].v1 = vec3(5.0, -5.0, 5.0); 
	triangles[4].v2 = vec3(5.0, 5.0, 5.0); 
	triangles[4].v3 = vec3(5.0, 5.0, -8.0); 
	triangles[4].MaterialIdx = 2; 
 
    triangles[5].v1 = vec3(5.0, 5.0,-8.0);
	triangles[5].v2 = vec3(5.0, -5.0, -8.0);
	triangles[5].v3 = vec3(5.0, -5.0, 5.0); 
	triangles[5].MaterialIdx = 2;
	
	triangles[6].v1 = vec3(-5.0, 5.0, 5.0); 
	triangles[6].v2 = vec3(-5.0, 5.0, -8.0); 
	triangles[6].v3 = vec3(5.0, 5.0, -8.0); 
	triangles[6].MaterialIdx = 3; 
 
    triangles[7].v1 = vec3(5.0, 5.0, -8.0); 
	triangles[7].v2 = vec3(5.0, 5.0, 5.0); 
	triangles[7].v3 = vec3(-5.0, 5.0, 5.0); 
	triangles[7].MaterialIdx = 3;
 
    triangles[8].v1 = vec3(-5.0, -5.0, 5.0);
	triangles[8].v2 = vec3(-5.0, -5.0, -8.0);
	triangles[8].v3 = vec3(5.0, -5.0, -8.0); 
	triangles[8].MaterialIdx = 4;
	
	triangles[9].v1 = vec3(5.0,-5.0,-8.0);
	triangles[9].v2 = vec3(5.0, -5.0, 5.0);
	triangles[9].v3 = vec3(-5.0, -5.0, 5.0); 
	triangles[9].MaterialIdx = 4;
	
	triangles[10].v1 = vec3(-5.0, -5.0, -8.0);
	triangles[10].v2 = vec3(5.0, -5.0, -8.0);
	triangles[10].v3 = vec3(5.0, 5.0, -8.0); 
	triangles[10].MaterialIdx = 5;
	
	triangles[11].v1 = vec3(5.0, 5.0,-8.0);
	triangles[11].v2 = vec3(-5.0, 5.0, -8.0);
	triangles[11].v3 = vec3(-5.0, -5.0, -8.0); 
	triangles[11].MaterialIdx = 5;
	
	// Инициализация двух сфер
	spheres[0].Center = vec3(2.0,0.0,2.0);  
	spheres[0].Radius = 0.3;  
	spheres[0].MaterialIdx = 6; 
 
    spheres[1].Center = vec3(-2.0,-1.0,1.0);  
	spheres[1].Radius = 1.3;  
	spheres[1].MaterialIdx = 6;

	// Инициализация куба из 12 треугольников
	cube.bounds[0].v1 = vec3(1.0,1.0,2.0);
	cube.bounds[0].v2 = vec3(1.0,1.5,2.0);
	cube.bounds[0].v3 = vec3(1.0,1.0,1.5);
	cube.bounds[0].MaterialIdx = 7;
	
	cube.bounds[1].v1 = vec3(1.0,1.5,1.5);
	cube.bounds[1].v2 = vec3(1.0,1.5,2.0);
	cube.bounds[1].v3 = vec3(1.0,1.0,1.5);
	cube.bounds[1].MaterialIdx = 7;

	cube.bounds[2].v1 = vec3(1.0,1.0,2.0);
	cube.bounds[2].v2 = vec3(1.0,1.5,2.0);
	cube.bounds[2].v3 = vec3(1.5,1.0,2.0);
	cube.bounds[2].MaterialIdx = 7;
	
	cube.bounds[3].v1 = vec3(1.5,1.5,2.0);
	cube.bounds[3].v2 = vec3(1.0,1.5,2.0);
	cube.bounds[3].v3 = vec3(1.5,1.0,2.0);
	cube.bounds[3].MaterialIdx = 7;
	
	cube.bounds[4].v1 = vec3(1.5,1.5,1.5);
	cube.bounds[4].v2 = vec3(1.0,1.5,1.5);
	cube.bounds[4].v3 = vec3(1.0,1.5,2.0);
	cube.bounds[4].MaterialIdx = 7;
	
	cube.bounds[5].v1 = vec3(1.5,1.5,1.5);
	cube.bounds[5].v2 = vec3(1.5,1.5,2.0);
	cube.bounds[5].v3 = vec3(1.0,1.5,2.0);
	cube.bounds[5].MaterialIdx = 7;
	
	cube.bounds[6].v1 = vec3(1.5,1.5,1.5);
	cube.bounds[6].v2 = vec3(1.5,1.5,2.0);
	cube.bounds[6].v3 = vec3(1.5,1.0,1.5);
	cube.bounds[6].MaterialIdx = 7;
	
	cube.bounds[7].v1 = vec3(1.5,1.0,2.0);
	cube.bounds[7].v2 = vec3(1.5,1.5,2.0);
	cube.bounds[7].v3 = vec3(1.5,1.0,1.5);
	cube.bounds[7].MaterialIdx = 7;
	
	cube.bounds[8].v1 = vec3(1.0,1.0,2.0);
	cube.bounds[8].v2 = vec3(1.0,1.0,1.5);
	cube.bounds[8].v3 = vec3(1.5,1.0,1.5);
	cube.bounds[8].MaterialIdx = 7;

	cube.bounds[9].v1 = vec3(1.0,1.0,2.0);
	cube.bounds[9].v2 = vec3(1.5,1.0,2.0);
	cube.bounds[9].v3 = vec3(1.5,1.0,1.5);
	cube.bounds[9].MaterialIdx = 7;
	
	cube.bounds[10].v1 = vec3(1.0,1.5,1.5);
	cube.bounds[10].v2 = vec3(1.5,1.5,1.5);
	cube.bounds[10].v3 = vec3(1.0,1.0,1.5);
	cube.bounds[10].MaterialIdx = 7;
	
	cube.bounds[11].v1 = vec3(1.5,1.0,1.5);
	cube.bounds[11].v2 = vec3(1.5,1.5,1.5);
	cube.bounds[11].v3 = vec3(1.0,1.0,1.5);
	cube.bounds[11].MaterialIdx = 7;
	cube.MaterialIdx = 7;
}



// Инициализация материалов и света по умолчанию
void initializeDefaultLightMaterials(out SLight light, out SMaterial materials[8]) 
{
    light.Position = vec3(0.0, 2.0, -4.0f); 
 
    vec4 lightCoefs = vec4(0.4,0.9,0.0,512.0); // ambient, diffuse, specular, shininess
    
    // Инициализация материалов (6 для комнаты, 1 для сфер, 1 для куба)    
	materials[0].Color = vec3(0.0, 1.0, 0.0);   
	materials[0].LightCoeffs = vec4(lightCoefs);
	materials[0].ReflectionCoef = 0.5;   
	materials[0].RefractionCoef = 1.0;  
	materials[0].MaterialType = DIFFUSE_REFLECTION;  
 
    materials[1].Color = vec3(0.0, 0.0, 1.0);  
	materials[1].LightCoeffs = vec4(lightCoefs); 
    materials[1].ReflectionCoef = 0.5;  
	materials[1].RefractionCoef = 1.0;  
	materials[1].MaterialType = DIFFUSE_REFLECTION;
	
	materials[2].Color = vec3(1.0, 0.0, 0.0);  
	materials[2].LightCoeffs = vec4(lightCoefs); 
    materials[2].ReflectionCoef = 0.5;  
	materials[2].RefractionCoef = 1.0;  
	materials[2].MaterialType = DIFFUSE_REFLECTION;
	
	materials[3].Color = vec3(1.0, 1.0, 1.0);  
	materials[3].LightCoeffs = vec4(lightCoefs); 
    materials[3].ReflectionCoef = 0.5;  
	materials[3].RefractionCoef = 1.0;  
	materials[3].MaterialType = DIFFUSE_REFLECTION;
	
	materials[4].Color = vec3(1.0, 1.0, 1.0);  
	materials[4].LightCoeffs = vec4(lightCoefs); 
    materials[4].ReflectionCoef = 0.5;  
	materials[4].RefractionCoef = 1.0;  
	materials[4].MaterialType = DIFFUSE_REFLECTION;
	
	materials[5].Color = vec3(1.0, 1.0, 1.0);  
	materials[5].LightCoeffs = vec4(lightCoefs); 
    materials[5].ReflectionCoef = 0.5;  
	materials[5].RefractionCoef = 1.0;  
	materials[5].MaterialType = DIFFUSE_REFLECTION;
	
	materials[6].Color = vec3(1.0, 1.0, 1.0);  
	materials[6].LightCoeffs = vec4(lightCoefs); 
    materials[6].ReflectionCoef = 0.5;  
	materials[6].RefractionCoef = 1.0;  
	materials[6].MaterialType = MIRROR_REFLECTION;

	materials[7].Color = cube_color;
	materials[7].LightCoeffs = vec4(lightCoefs); 
    materials[7].ReflectionCoef = 0.5;  
	materials[7].RefractionCoef = 1.0;  
	materials[7].MaterialType = DIFFUSE_REFLECTION;
}


// Решение квадратного уравнения (используется для пересечения сферы)
bool solveQuadratic(const float a, const float b, const float c, out float x0, out float x1)
{
    float discr = b * b - 4 * a * c;
    if (discr < 0) 
		return false;
    else if (discr == 0) 
	{
        x0 = x1 = - 0.5 * b / a;
    }
	else 
	{
        float q = (b > 0) ?
		-0.5 * (b + sqrt(discr)) :
		-0.5 * (b - sqrt(discr));
        x0 = q / a;
        x1 = c / q;
    }
	return true;
}


// Проверка пересечения луча со сферой
bool IntersectSphere ( SSphere sphere, SRay ray, float start, float final, out float time )
{     
    ray.Origin -= sphere.Center;  
	float A = dot ( ray.Direction, ray.Direction );  
	float B = dot ( ray.Direction, ray.Origin );   
	float C = dot ( ray.Origin, ray.Origin ) - sphere.Radius * sphere.Radius;  
	float D = B * B - A * C; 
    if ( D > 0.0 )  
	{
    	D = sqrt ( D );
		float t1 = ( -B - D ) / A;   
		float t2 = ( -B + D ) / A;      
		if(t1 < 0 && t2 < 0)    return false;    
        if(min(t1, t2) < 0)   
		{            
    		time = max(t1,t2);      
			return true;      
		}  
		time = min(t1, t2);    
		return true;  
	}  
	return false; 
}


// Проверка пересечения луча с треугольником
bool IntersectTriangle (SRay ray, vec3 v1, vec3 v2, vec3 v3, out float time ) 
{
    time = -1; 
	vec3 A = v2 - v1; 
	vec3 B = v3 - v1; 	
	vec3 N = cross(A, B);
	float NdotRayDirection = dot(N, ray.Direction); 
	if (abs(NdotRayDirection) < 0.001)   return false; 
	float d = dot(N, v1);
	float t = -(dot(N, ray.Origin) - d) / NdotRayDirection; 
	if (t < 0)   return false; 
	vec3 P = ray.Origin + t * ray.Direction;
	vec3 C;
	vec3 edge1 = v2 - v1; 
	vec3 VP1 = P - v1; 
	C = cross(edge1, VP1); 
	if (dot(N, C) < 0)  return false;
	vec3 edge2 = v3 - v2; 
	vec3 VP2 = P - v2; 
	C = cross(edge2, VP2); 
	if (dot(N, C) < 0)   return false;
	vec3 edge3 = v1 - v3; 
	vec3 VP3 = P - v3; 
	C = cross(edge3, VP3); 
	if (dot(N, C) < 0)   return false;
	time = t; 
	return true; 
}

// Основная функция трассировки лучей
bool Raytrace ( SRay ray, float start, float final, inout SIntersection intersect ) 
{ 
    bool result = false; 
	float test = start; 
	intersect.Time = final; 
	
	// Проверка пересечения со всеми треугольниками комнаты
    for(int i = 0; i < 12; i++) 
    {
        STriangle triangle = Triangles[i]; 
        if(IntersectTriangle(ray, triangle.v1, triangle.v2, triangle.v3, test) && test < intersect.Time)
        {        
            intersect.Time = test;  
            intersect.Point = ray.Origin + ray.Direction * test;  
            intersect.Normal = normalize(cross(triangle.v1 - triangle.v2, triangle.v3 - triangle.v2));
            SMaterial mat = Materials[i / 2]; // Материал берется по 2 треугольника на грань
            intersect.Color = mat.Color;    
            intersect.LightCoeffs = mat.LightCoeffs;
            intersect.ReflectionCoef = mat.ReflectionCoef;       
            intersect.RefractionCoef = mat.RefractionCoef;       
            intersect.MaterialType = mat.MaterialType;       
            result = true;   
        } 
    }
    
    // Проверка пересечения со сферами
    for(int i = 0; i < 2; i++) 
    {   
        SSphere sphere = Spheres[i];
        if( IntersectSphere (sphere, ray, start, final, test ) && test < intersect.Time )  
        {       
            intersect.Time = test;    
            intersect.Point = ray.Origin + ray.Direction * test;      
            intersect.Normal = normalize ( intersect.Point - sphere.Center );
            SMaterial mat = Materials[6]; // Материал сфер
            intersect.Color = mat.Color;        
            intersect.LightCoeffs = mat.LightCoeffs;
            intersect.ReflectionCoef = mat.ReflectionCoef;   
            intersect.RefractionCoef = mat.RefractionCoef;       
            intersect.MaterialType = mat.MaterialType;  
            result = true;    
        } 
    }

    // Проверка пересечения с кубом
    for(int i = 0; i < 12; i++) 
    {
        STriangle triangle = cube.bounds[i]; 
        if(IntersectTriangle(ray, triangle.v1, triangle.v2, triangle.v3, test) && test < intersect.Time)
        {        
            intersect.Time = test;  
            intersect.Point = ray.Origin + ray.Direction * test;  
            intersect.Normal = normalize(cross(triangle.v1 - triangle.v2, triangle.v3 - triangle.v2));
            SMaterial mat = Materials[7]; // Материал куба
            intersect.Color = cube_color; // Используем переданный извне цвет куба   
            intersect.LightCoeffs = mat.LightCoeffs;
            intersect.ReflectionCoef = mat.ReflectionCoef;       
            intersect.RefractionCoef = mat.RefractionCoef;       
            intersect.MaterialType = mat.MaterialType;       
            result = true;   
        } 
    }
    return result;
} 


// Модель освещения Фонга
vec3 Phong ( SIntersection intersect, SLight currLight, float shadowing) 
{
    vec3 light = normalize ( currLight.Position - intersect.Point ); 
    float diffuse = max(dot(light, intersect.Normal), 0.0);   
	vec3 view = normalize(uCamera.Position - intersect.Point);  
	vec3 reflected= reflect( -view, intersect.Normal );   
	float specular = pow(max(dot(reflected, light), 0.0), intersect.LightCoeffs.w);    
	return intersect.LightCoeffs.x * intersect.Color + 
	       intersect.LightCoeffs.y * diffuse * intersect.Color * shadowing + 
		   intersect.LightCoeffs.z * specular * Unit;
} 


// Расчет тени для точки пересечения
float Shadow(SLight currLight, SIntersection intersect) 
{     
    float shadowing = 1.0;  
    vec3 direction = normalize(currLight.Position - intersect.Point);   
    float distanceLight = distance(currLight.Position, intersect.Point);  
    SRay shadowRay = SRay(intersect.Point + direction * 0.001, direction); // Луч к источнику света
    SIntersection shadowIntersect;     
    shadowIntersect.Time = 1000000.0;      
    if(Raytrace(shadowRay, 0, distanceLight, shadowIntersect)) // Если есть пересечение - точка в тени
    {   
        shadowing = 0.0;     
    }
    return shadowing; 
}

STracingRay stack[MAX_STACK_SIZE];
int stackSize = 0;

// Добавление луча в стек
bool pushRay(STracingRay secondaryRay)
{
	if(stackSize < MAX_STACK_SIZE - 1 && secondaryRay.depth < MAX_TRACE_DEPTH)
	{
		stack[stackSize] = secondaryRay;
		stackSize++;
		return true;
	}
	return false;
}

bool isEmpty()
{
	if(stackSize < 0)
		return true;
	return false;
}


// Извлечение луча из стека
STracingRay popRay()
{
	stackSize--;
	return stack[stackSize];	
}


// Главная функция фрагментного шейдера
void main ( void )
{
    float start = 0;   // Начальное расстояние для трассировки
    float final = 1000000.0; // Максимальное расстояние
    
    // Инициализация камеры
    uCamera.Position = camera_position;
    uCamera.View = vec3(0.0, 0.0, 1.0); 
    uCamera.Up = vec3(0.0, 1.0, 0.0);  
    uCamera.Side = vec3(1.0, 0.0, 0.0); 
    uCamera.Scale = vec2(1.0); 
    
    // Генерация первичного луча
    SRay ray = GenerateRay( uCamera);
    SIntersection intersect;        
    intersect.Time = 1000000.0;    
    vec3 resultColor = vec3(0,0,0); // Итоговый цвет
    
    // Инициализация сцены
    initializeDefaultLightMaterials(uLight, Materials);
    initializeDefaultScene(Triangles, Spheres);    
    
    // Инициализация стека лучей
    STracingRay trRay = STracingRay(ray, 1, 0); 
    pushRay(trRay); 
    
    // Основной цикл трассировки (вместо рекурсии)
    while(!isEmpty()) 
    {     
        STracingRay trRay = popRay();     // Берем луч из стека
        ray = trRay.ray;    
        SIntersection intersect;  
        intersect.Time = 1000000.0;   
        start = 0;     
        final = 1000000.0;    
        
        // Трассировка луча
        if (Raytrace(ray, start, final, intersect))
        {   
            switch(intersect.MaterialType){
                case DIFFUSE_REFLECTION: // Диффузное отражение        
                {  
                    float shadowing = Shadow(uLight, intersect);   
                    resultColor += trRay.contribution * Phong ( intersect, uLight, shadowing );   
                    break;       
                }  
                case MIRROR_REFLECTION: // Зеркальное отражение
                { 
                    if(intersect.ReflectionCoef < 1)   
                    {              
                        float contribution = trRay.contribution * (1 - intersect.ReflectionCoef);     
                        float shadowing = Shadow(uLight, intersect);              
                        resultColor += contribution * Phong(intersect, uLight, shadowing);    
                    }  
                    vec3 reflectDirection = reflect(ray.Direction, intersect.Normal);
                    float contribution = trRay.contribution * intersect.ReflectionCoef;  
                    STracingRay reflectRay = STracingRay( 
                        SRay(intersect.Point + reflectDirection * 0.001, reflectDirection), 
                        contribution, 
                        trRay.depth + 1);    
                    pushRay(reflectRay); // Добавляем отраженный луч в стек
                    break;  
                }     
            }  
        }
    }
    // Запись итогового цвета
    FragColor = vec4 ( resultColor, 1.0 );
}