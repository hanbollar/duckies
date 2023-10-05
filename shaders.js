// Shaders used in our setup.
//
// Separated for readability and convenience.

export function water_VS() {
    return `
        uniform vec2 u_dimensions;
        uniform float u_time;

        varying vec3 fs_pos;
        varying vec2 fs_uv;

        #define M_PI 3.141592

        float gen_noise(float x, float y, float z) {
            // known noise function - save it bc it works
            // play with the values as needed for the noise function
            // graphtoy
            return fract(sin(dot(vec3(x, y, z) ,vec3(12.9898,78.233,53.641))) * 43758.5453);
        }

        float lerp(float a, float b, float t) {
            return a * (1.0 - t) + b * t;
        }

        float cosine_interpolation(float a, float b, float t) {
          return lerp(a, b, (1.0 - cos(t * M_PI)) * 0.5);
        }

        float noise_interpolation(float x, float y, float z) {
            float x0 = floor(x);
            float x1 = floor(x) + 1.0;
            float y0 = floor(y);
            float y1 = floor(y) + 1.0;
            float z0 = floor(z);
            float z1 = floor(z) + 1.0;

            float interp_000 = gen_noise(x0, y0, z0);
            float interp_001 = gen_noise(x0, y0, z1);
            float interp_010 = gen_noise(x0, y1, z0);
            float interp_011 = gen_noise(x0, y1, z1);
            float interp_100 = gen_noise(x1, y0, z0);
            float interp_101 = gen_noise(x1, y0, z1);
            float interp_110 = gen_noise(x1, y1, z0);
            float interp_111 = gen_noise(x1, y1, z1);

            float dx = x - x0;
            float dy = y - y0;
            float dz = z - z0;

            float interp_x00 = cosine_interpolation(interp_000, interp_100, dx);
            float interp_x01 = cosine_interpolation(interp_001, interp_101, dx);
            float interp_x10 = cosine_interpolation(interp_010, interp_110, dx);
            float interp_x11 = cosine_interpolation(interp_011, interp_111, dx);

            float interp_y0 = cosine_interpolation(interp_x00, interp_x10, dy);
            float interp_y1 = cosine_interpolation(interp_x01, interp_x11, dy);

            float interp_z = cosine_interpolation(interp_y0, interp_y1, dz);
            return interp_z;
        }

        float multi_octave_noise(float x, float y, float t) {
            // Change these to play with the noise effect
            float persistence = 0.09;
            int octaves = 5;

            // multi-octave
            float total = 0.0;
            for (int i = 0; i < 10 && i < octaves; ++i) {
                float freq = pow(2.0, 1.0);
                float amp = pow(persistence, 1.0);

                total += noise_interpolation(freq * x, freq * y, t) * amp;
            }

            return total;
        }

        void main() {
            float scale = 2.0;
            float height = multi_octave_noise(position.x * scale, position.y * scale, u_time);

            gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, height, 1.0);
            fs_pos      = vec3(gl_Position);
            fs_uv       = position.xy;
        }
    `
}

export function water_FS() {
    return `
        uniform vec2 u_dimensions;
        uniform float u_time;

        varying vec3 fs_pos;
        varying vec2 fs_uv;

        #define M_PI 3.141592
        #define M_2PI 6.283185
        #define POOL_RADIUS 3.0
        #define POOL_RADIUS_SQRD 9.0

        vec2 rand(vec2 x) {
            return fract( sin( vec2( dot(x, vec2(1.2, 5.5) ), dot(x, vec2(4.54, 2.41) ) ) ) * 4.45);
        }

        // finishing the pattern matching for compile
        vec2 mix(vec2 a, vec2 b, float lerp) {
            return a * (1.0-lerp) + b * (lerp);
        }

        // references:
        // https://iquilezles.org/articles/voronoilines
        // https://thebookofshaders.com/12/?lan=en
        vec3 voronoi(vec2 uv) {
            vec2 uv_id = floor(uv);
            vec2 uv_st = fract(uv);

            vec2 min_diff;
            vec2 min_point;
            vec2 min_neighbor;

            // check neighboring around current loc
            float min_dist = 10.0;
            for (float x_offset =- 1.0; x_offset <= 1.0; ++x_offset) {
                for (float y_offset = -1.0; y_offset <= 1.0; ++y_offset) {
                    // setup
                    vec2 neighbor   = vec2(x_offset, y_offset);
                    vec2 point      = rand(uv_id + neighbor);
                    // offset
                    point = 0.5 + 0.5 * sin(M_2PI * point + u_time);

                    // set new min values if dist is less than minimum dist
                    vec2 diff   = neighbor + point - uv_st;
                    float dist  = length(diff);
                    float is_new_min = float(dist < min_dist);
                    min_dist        = mix(min_dist,     dist,       is_new_min);
                    min_point       = mix(min_point,    point,      is_new_min);
                    min_diff        = mix(min_diff,     diff,       is_new_min);
                    min_neighbor    = mix(min_neighbor, neighbor,   is_new_min);
                }
            }

            // second pass with larger bound for offset
            min_dist = 10.0;
            for (float x_offset = -2.0; x_offset <= 2.0; ++x_offset) {
                for (float y_offset = -2.0; y_offset <= 2.0; ++y_offset) {
                    // create the border
                    if (x_offset==0.0 && y_offset==0.0) {
                        continue;
                    }

                    // setup
                    vec2 neighbor = min_neighbor + vec2(x_offset, y_offset);
                    vec2 point = rand(uv_id + neighbor);
                    // offset
                    point = 0.5 + 0.5 * sin(point * M_2PI + u_time);

                    // specific calc for color
                    vec2 diff = neighbor + point - uv_st;
                    float dist = dot(0.5*(min_diff + diff), normalize(diff - min_diff));

                    min_point = point;
                    min_dist = min(min_dist, dist);
                }
            }

            return vec3(min_point, min_dist);
        }

        void main() {
            // create proper index positioning based on geometry
            vec2 uv = vec2(fs_uv.x / u_dimensions.x, fs_uv.y / u_dimensions.y);
            uv -= 0.5;
            uv /= vec2(u_dimensions.y / u_dimensions.x, 1.0);

            // calculate the voronoi for water texture
            vec3 voronoi = voronoi(uv * 100.0);
        
            // fill the color on output
            float ambient_light = 0.2;
            float within_pool_radius = float(fs_uv.x*fs_uv.x + fs_uv.y*fs_uv.y <= 0.25);
            gl_FragColor = vec4(    ambient_light,
                                    ambient_light + 0.01 * voronoi.x,
                                    ambient_light + voronoi.y,
                                    within_pool_radius);
        }
    `
}

export function ground_VS() {
    return `
        uniform vec3 u_dimensions;
        uniform float u_time;

        varying vec2 fs_uv;

        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            fs_uv = vec2(position);
        }
    `
}

export function ground_FS() {
    return `
        uniform vec3 u_dimensions;
        uniform float u_time;

        varying vec2 fs_uv;

        void main(){
            float within_ground_radius = float(fs_uv.x*fs_uv.x + fs_uv.y*fs_uv.y <= 1.2);
            gl_FragColor = mix(vec4(1, 1, 0, 1.0), vec4(.1,.3,.1,1.0), within_ground_radius);
        }
    `
}

// export function balloon_VS() {
//     return `
//         uniform vec3 u_dimensions;
//         uniform float u_time;

//         varying vec3 fs_pos;

//         void main() {
//             gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//             fs_pos      = vec3(position);
//         }
//     `
// }

// export function balloon_FS() {
//     return `
//         uniform vec3 u_dimensions;
//         uniform float u_time;

//         varying vec3 fs_pos;

//         void main(){
//             gl_FragColor = vec4(1, 1, 0, 1);
//         }
//     `
// }